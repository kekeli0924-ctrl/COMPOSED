// 4-week technical homework blocks.
//
// Endpoints:
//   POST   /api/blocks                     — coach creates a block (generates assigned_plans)
//   GET    /api/blocks                     — coach lists their own blocks
//   GET    /api/blocks/:id                 — coach sees per-player status for one block
//   GET    /api/blocks/:id/export          — coach downloads CSV
//   GET    /api/blocks/active-for-player   — player asks "what's due today?"
//
// Design:
//   - Block membership is the JSON array `member_ids` on the block row.
//   - Assigned plans are NOT tagged with block_id. They're attributable to a block if
//     (coach, player, date ∈ block window) match.
//   - Benchmarks are NOT tagged with block_id. Phase is derived from date windows
//     centered on start_date (baseline ±7d, retest_1 start+14 ±5d, retest_2 start+28 ±5d).
//   - Training days are integers 0..6 (0=Sun..6=Sat). The schedule is a deterministic
//     walk over the 28-day window picking dates whose day-of-week is in trainingDays.

import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { requireCoach } from '../auth.js';
import { validate, blockCreateSchema } from '../validation.js';
import { logger } from '../logger.js';
import { emit } from '../events.js';

const router = Router();

// Server-side "trending" label — intentionally NOT the full Pace calc.
// The client-side Pace helper uses extensionless `./stats` imports that Node ESM
// can't resolve; reusing it server-side would require modifying pace.js. We said
// we wouldn't change the Pace calc, so we ship a simple session-count comparison
// for the block detail view. The coach still has the real Pace label available
// on each player's normal profile. CSV export uses this simple label too.
function simpleTrend(recentSessionCount, priorSessionCount) {
  if (recentSessionCount === 0 && priorSessionCount === 0) return null;
  if (recentSessionCount > priorSessionCount) return 'accelerating';
  if (recentSessionCount < priorSessionCount) return 'stalling';
  return 'steady';
}

// ── Date helpers ────────────────────────────────────────────────────────────

// Parse YYYY-MM-DD. Using UTC avoids DST-induced off-by-one when computing offsets.
function parseDate(yyyymmdd) {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(yyyymmdd, days) {
  const d = parseDate(yyyymmdd);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

function dayOfWeek(yyyymmdd) {
  return parseDate(yyyymmdd).getUTCDay();
}

// Given a 4-week window and a pair of training-day ints, return the 8 dates
// to schedule assigned plans on. Deterministic walk over the 28-day range.
function computeSchedule(startDate, trainingDays) {
  const schedule = [];
  for (let d = 0; d < 28; d++) {
    const date = addDays(startDate, d);
    if (trainingDays.includes(dayOfWeek(date))) schedule.push(date);
  }
  return schedule;
}

// ── Row shaping ─────────────────────────────────────────────────────────────

function rowToBlock(row) {
  return {
    id: row.id,
    coachId: row.coach_id,
    name: row.name,
    startDate: row.start_date,
    endDate: addDays(row.start_date, 27),
    trainingDays: JSON.parse(row.training_days || '[]'),
    memberIds: JSON.parse(row.member_ids || '[]'),
    status: row.status,
    createdAt: row.created_at,
    // Derived due dates — echoed here so the client doesn't recompute.
    baselineDue: row.start_date,
    retest1Due: addDays(row.start_date, 14),
    retest2Due: addDays(row.start_date, 28),
  };
}

// ── Benchmark phase windows ────────────────────────────────────────────────

const PHASE_WINDOWS = {
  baseline: { offset: 0, halfWidth: 7 },    // start_date ± 7d
  retest_1: { offset: 14, halfWidth: 5 },   // start_date + 14d ± 5d
  retest_2: { offset: 28, halfWidth: 5 },   // start_date + 28d ± 5d
};

function windowFor(phase, startDate) {
  const w = PHASE_WINDOWS[phase];
  return {
    from: addDays(startDate, w.offset - w.halfWidth),
    to: addDays(startDate, w.offset + w.halfWidth),
    dueDate: addDays(startDate, w.offset),
  };
}

// Find the most recent benchmark of a given type within a phase window for a player.
// Returns { score, date } or null. "Most recent" means highest `date` — if a player
// logs two in the window, we credit the latest.
function findBenchmark(db, playerId, type, window) {
  return db.prepare(`
    SELECT date, score FROM benchmarks
    WHERE user_id = ? AND type = ? AND date BETWEEN ? AND ?
    ORDER BY date DESC LIMIT 1
  `).get(playerId, type, window.from, window.to) || null;
}

// ── Per-player block status (used by GET /:id and CSV export) ──────────────
//
// Returns an array of status objects — one per block.member_ids entry — with
// all the fields the coach's block-detail view needs. Deliberately a single
// round-trip per player for clarity over micro-optimization; rosters are <=50.
function buildPlayerStatus(db, block) {
  const scheduleCount = computeSchedule(block.startDate, block.trainingDays).length;
  const endDate = block.endDate;

  return block.memberIds.map(playerId => {
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(playerId);
    const settings = db.prepare('SELECT player_name, position FROM settings WHERE user_id = ?').get(playerId) || {};
    const link = db.prepare('SELECT 1 FROM coach_players WHERE coach_id = ? AND player_id = ?')
      .get(block.coachId, playerId);

    // Benchmarks by phase — lspt and lsst separately.
    const phases = {};
    for (const phase of ['baseline', 'retest_1', 'retest_2']) {
      const w = windowFor(phase, block.startDate);
      phases[phase] = {
        dueDate: w.dueDate,
        lspt: findBenchmark(db, playerId, 'lspt', w),
        lsst: findBenchmark(db, playerId, 'lsst', w),
      };
    }

    // Assigned plans in-window for this player from this coach.
    const assigned = db.prepare(`
      SELECT date FROM assigned_plans
      WHERE coach_id = ? AND player_id = ? AND date BETWEEN ? AND ?
    `).all(block.coachId, playerId, block.startDate, endDate);

    // Sessions the player logged on any of those assigned dates.
    const assignedDates = assigned.map(a => a.date);
    const completed = assignedDates.length === 0 ? 0 : db.prepare(`
      SELECT COUNT(DISTINCT date) AS c FROM sessions
      WHERE user_id = ? AND date IN (${assignedDates.map(() => '?').join(',')})
    `).get(playerId, ...assignedDates).c;

    // Simple trend label — compares latest 7d session count vs prior 7d.
    // Not a full Pace calc (see simpleTrend note above).
    const midpoint = addDays(block.startDate, 14);
    const firstHalfCount = db.prepare(`
      SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND date BETWEEN ? AND ?
    `).get(playerId, block.startDate, addDays(midpoint, -1)).c;
    const secondHalfCount = db.prepare(`
      SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND date BETWEEN ? AND ?
    `).get(playerId, midpoint, endDate).c;
    const primaryPosition = parsePrimaryPosition(settings.position);

    return {
      playerId,
      username: user?.username || `user-${playerId}`,
      playerName: settings.player_name || user?.username || `Player ${playerId}`,
      position: primaryPosition,
      linked: !!link,
      phases,
      assignedCount: assigned.length,
      expectedCount: scheduleCount,
      completedCount: completed,
      paceLabel: simpleTrend(secondHalfCount, firstHalfCount),
    };
  });
}

function parsePrimaryPosition(rawPos) {
  if (!rawPos) return 'General';
  try {
    const parsed = JSON.parse(rawPos);
    if (Array.isArray(parsed) && parsed[0]) return parsed[0];
  } catch { /* legacy bare string */ }
  return typeof rawPos === 'string' && rawPos !== 'General' ? rawPos : 'General';
}

// ── POST /api/blocks ────────────────────────────────────────────────────────

router.post('/', requireCoach, validate(blockCreateSchema), (req, res) => {
  const db = getDb();
  const { name, startDate, trainingDays, memberIds, drillTemplate } = req.body;

  // Verify every memberId is actually on this coach's roster. Don't trust the client.
  const rosterRows = db.prepare(`
    SELECT player_id FROM coach_players WHERE coach_id = ?
  `).all(req.userId);
  const rosterSet = new Set(rosterRows.map(r => r.player_id));
  const invalidMembers = memberIds.filter(id => !rosterSet.has(id));
  if (invalidMembers.length > 0) {
    return res.status(400).json({
      error: `Members not on your roster: ${invalidMembers.join(', ')}`,
      code: 'INVALID_MEMBERS',
    });
  }

  const blockId = crypto.randomUUID();
  const dates = computeSchedule(startDate, trainingDays);
  const drills = (drillTemplate && drillTemplate.length > 0)
    ? drillTemplate
    : ['Technical homework — refer to coach brief'];

  // Insert block + all assigned_plans rows in a single transaction so a partial
  // failure (duplicate plan for a date, etc.) doesn't leave half a block behind.
  const insertBlock = db.prepare(`
    INSERT INTO blocks (id, coach_id, name, start_date, training_days, member_ids, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);
  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO assigned_plans (id, coach_id, player_id, date, drills, target_duration, notes)
    VALUES (?, ?, ?, ?, ?, 45, ?)
  `);
  const planNotes = `Block: ${name || '4-Week Block'}`;

  const tx = db.transaction(() => {
    insertBlock.run(
      blockId,
      req.userId,
      name || '4-Week Block',
      startDate,
      JSON.stringify(trainingDays),
      JSON.stringify(memberIds),
    );
    for (const playerId of memberIds) {
      for (const date of dates) {
        insertPlan.run(
          crypto.randomUUID(),
          req.userId,
          playerId,
          date,
          JSON.stringify(drills),
          planNotes,
        );
      }
    }
  });

  try {
    tx();
  } catch (err) {
    logger.error('Block creation failed', { error: err.message, coachId: req.userId });
    return res.status(500).json({ error: 'Block creation failed', code: 'BLOCK_CREATE_FAILED' });
  }

  // Pilot telemetry: one assigned_plan_created emit per generated row would flood
  // the feed; emit once for the block creation itself via the existing event.
  for (const playerId of memberIds) {
    emit('assigned_plan_created', {
      userId: req.userId,
      relatedUserId: playerId,
      role: 'coach',
      properties: { blockId, planCount: dates.length, scope: 'block' },
    });
  }

  const row = db.prepare('SELECT * FROM blocks WHERE id = ?').get(blockId);
  res.status(201).json(rowToBlock(row));
});

// ── GET /api/blocks ─────────────────────────────────────────────────────────

router.get('/', requireCoach, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM blocks WHERE coach_id = ? ORDER BY created_at DESC
  `).all(req.userId);
  res.json(rows.map(r => {
    const block = rowToBlock(r);
    return {
      ...block,
      memberCount: block.memberIds.length,
    };
  }));
});

// ── GET /api/blocks/active-for-player ──────────────────────────────────────
// Player-side. Returns the single active block the player belongs to (if any),
// plus what's due today. If a player is in multiple active blocks (rare during
// a pilot), we return the most recently created.
router.get('/active-for-player', (req, res) => {
  const db = getDb();
  const today = formatDate(new Date());

  // Find active blocks where this player is a member. SQLite JSON1's json_each
  // lets us filter on member_ids without parsing every row.
  const rows = db.prepare(`
    SELECT b.* FROM blocks b
    WHERE b.status = 'active'
      AND EXISTS (
        SELECT 1 FROM json_each(b.member_ids) je WHERE je.value = ?
      )
    ORDER BY b.created_at DESC
  `).all(req.userId);

  if (rows.length === 0) return res.json(null);
  const block = rowToBlock(rows[0]);

  // Figure out "what's due today" — highest-priority prompt.
  // Order: active-day session due > baseline benchmark > retest benchmark > nothing.
  const sessionDueToday = db.prepare(`
    SELECT COUNT(*) AS c FROM assigned_plans
    WHERE coach_id = ? AND player_id = ? AND date = ?
  `).get(block.coachId, req.userId, today).c > 0;

  const sessionLoggedToday = db.prepare(`
    SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND date = ?
  `).get(req.userId, today).c > 0;

  // Benchmark due logic: "due" if today is within the phase window AND the player
  // hasn't recorded a benchmark of either type for that phase yet.
  const benchmarkDue = (() => {
    for (const phase of ['baseline', 'retest_1', 'retest_2']) {
      const w = windowFor(phase, block.startDate);
      if (today < w.from || today > w.to) continue;
      const lspt = findBenchmark(db, req.userId, 'lspt', w);
      const lsst = findBenchmark(db, req.userId, 'lsst', w);
      if (!lspt || !lsst) return { phase, dueDate: w.dueDate, windowFrom: w.from, windowTo: w.to, hasLspt: !!lspt, hasLsst: !!lsst };
    }
    return null;
  })();

  res.json({
    ...block,
    today,
    sessionDueToday: sessionDueToday && !sessionLoggedToday,
    sessionLoggedToday,
    benchmarkDue,
  });
});

// ── GET /api/blocks/:id ─────────────────────────────────────────────────────

router.get('/:id', requireCoach, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM blocks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Block not found', code: 'NOT_FOUND' });
  if (row.coach_id !== req.userId) {
    return res.status(403).json({ error: 'Not your block', code: 'FORBIDDEN' });
  }
  const block = rowToBlock(row);
  const players = buildPlayerStatus(db, block);
  res.json({ ...block, players });
});

// ── GET /api/blocks/:id/export (CSV) ────────────────────────────────────────

router.get('/:id/export', requireCoach, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM blocks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Block not found', code: 'NOT_FOUND' });
  if (row.coach_id !== req.userId) {
    return res.status(403).json({ error: 'Not your block', code: 'FORBIDDEN' });
  }
  const block = rowToBlock(row);
  const players = buildPlayerStatus(db, block);

  const headers = [
    'player_name', 'position',
    'baseline_lspt_score', 'baseline_lspt_date',
    'baseline_lsst_score', 'baseline_lsst_date',
    'week2_lspt_score', 'week2_lspt_date',
    'week2_lsst_score', 'week2_lsst_date',
    'week4_lspt_score', 'week4_lspt_date',
    'week4_lsst_score', 'week4_lsst_date',
    'lspt_delta', 'lsst_delta',
    'assigned_sessions', 'completed_sessions',
    'current_pace_label',
  ];

  const rows = players.map(p => {
    const bl = p.phases.baseline;
    const w2 = p.phases.retest_1;
    const w4 = p.phases.retest_2;
    const lsptDelta = (bl.lspt && w4.lspt) ? (w4.lspt.score - bl.lspt.score).toFixed(2) : '';
    const lsstDelta = (bl.lsst && w4.lsst) ? (w4.lsst.score - bl.lsst.score).toFixed(2) : '';
    return [
      csvEscape(p.playerName),
      csvEscape(p.position),
      bl.lspt?.score ?? '',
      bl.lspt?.date ?? '',
      bl.lsst?.score ?? '',
      bl.lsst?.date ?? '',
      w2.lspt?.score ?? '',
      w2.lspt?.date ?? '',
      w2.lsst?.score ?? '',
      w2.lsst?.date ?? '',
      w4.lspt?.score ?? '',
      w4.lspt?.date ?? '',
      w4.lsst?.score ?? '',
      w4.lsst?.date ?? '',
      lsptDelta,
      lsstDelta,
      p.assignedCount,
      p.completedCount,
      csvEscape(p.paceLabel || ''),
    ].join(',');
  });

  const csv = headers.join(',') + '\n' + rows.join('\n') + '\n';
  const fileDate = formatDate(new Date());
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="block-${block.id.slice(0, 8)}-${fileDate}.csv"`);
  res.send(csv);
});

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default router;
