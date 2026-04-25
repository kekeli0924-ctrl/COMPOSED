// Snapshot-based public digest URLs for 4-week blocks.
//
// Three surfaces:
//   - Coach-authenticated: POST/GET/DELETE under /api/blocks/:blockId/digests
//   - Public (no auth):    GET /api/public/digest/:slug
//                          POST /api/public/digest/:slug/opened   (telemetry only)
//
// Design:
//   - Snapshot is written once at generation and never recomputed. The public
//     viewer never hits blocks/sessions/benchmarks tables — it reads JSON from
//     block_digests.snapshot. That's the entire point of "snapshot-based."
//   - Revoke = set revoked_at. Public endpoint returns 410 Gone thereafter.
//   - Slug is 128 bits of URL-safe random — unguessable, indexed, unique.
//
// Privacy (enforced in buildSnapshot below):
//   - no private notes / reflections / intentions
//   - no parent-only fields
//   - no session-level commentary
//   - only derived numbers, player display names, positions, deterministic
//     one-liners composed from those numbers.

import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { requireCoach } from '../auth.js';
import { emit } from '../events.js';
import { logger } from '../logger.js';

// ── Helpers shared with blocks.js (duplicated deliberately to avoid cross-route coupling) ──

function parseDate(yyyymmdd) {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatDate(d) { return d.toISOString().slice(0, 10); }
function addDays(yyyymmdd, days) {
  const d = parseDate(yyyymmdd);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}
function dayOfWeek(yyyymmdd) { return parseDate(yyyymmdd).getUTCDay(); }
function computeSchedule(startDate, trainingDays) {
  const out = [];
  for (let i = 0; i < 28; i++) {
    const d = addDays(startDate, i);
    if (trainingDays.includes(dayOfWeek(d))) out.push(d);
  }
  return out;
}

const PHASE_WINDOWS = {
  baseline: { offset: 0, halfWidth: 7 },
  retest_1: { offset: 14, halfWidth: 5 },
  retest_2: { offset: 28, halfWidth: 5 },
};
function windowFor(phase, startDate) {
  const w = PHASE_WINDOWS[phase];
  return {
    from: addDays(startDate, w.offset - w.halfWidth),
    to: addDays(startDate, w.offset + w.halfWidth),
  };
}
function findBenchmark(db, playerId, type, win) {
  return db.prepare(`
    SELECT date, score FROM benchmarks
    WHERE user_id = ? AND type = ? AND date BETWEEN ? AND ?
    ORDER BY date DESC LIMIT 1
  `).get(playerId, type, win.from, win.to) || null;
}

function parsePrimaryPosition(raw) {
  if (!raw) return 'General';
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p) && p[0]) return p[0];
  } catch { /* legacy bare string */ }
  return typeof raw === 'string' && raw !== 'General' ? raw : 'General';
}

// Privacy-safe public name. NEVER returns the raw username — usernames are
// internal handles and the public digest URL is shareable to people without
// accounts. Priority:
//   1. settings.player_name with two+ tokens → first name + last initial ("Maya R.")
//   2. settings.player_name with one token → that token ("Maya")
//   3. fallback → "Player N" using the 1-based index within the block
// Never falls back to the username column.
function toPublicName(playerName, indexInBlock) {
  const trimmed = (playerName || '').trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
      return `${first} ${lastInitial}.`;
    }
    return parts[0];
  }
  return `Player ${indexInBlock + 1}`;
}

// Deterministic one-liner. No AI. Purely composed from computed numbers.
//
// Note on Pace: this digest uses a session-count delta as a *training-activity*
// signal — it intentionally does NOT call this "Pace up/down/steady" because the
// real player-facing Pace calculation (computePace in src/utils/pace.js) is
// position/identity-weighted and can disagree with a raw session-count trend.
// Publishing a "Pace up" claim that contradicts the in-app Pace would be worse
// than publishing nothing. Neutral activity language keeps the digest honest.
function composeOneLiner({ publicName, sessionsAssigned, sessionsCompleted, baselineDone, activity }) {
  const first = publicName.split(/\s+/)[0];
  const sessionsClause = `completed ${sessionsCompleted}/${sessionsAssigned} sessions`;
  const activityClause =
    activity === 'increased' ? 'training activity increased this week' :
    activity === 'decreased' ? 'training activity decreased this week' :
    activity === 'steady'    ? 'training activity held steady' : null;
  const baselineClause = baselineDone ? 'baseline complete' : 'baseline pending';
  const parts = [sessionsClause, activityClause, baselineClause].filter(Boolean);
  return `${first} ${parts.join(', ')}.`;
}

// Build the snapshot. This is the ONLY time we read live data for a digest.
// Everything the public viewer sees comes from this function's return value.
function buildSnapshot(db, block, coachDisplayName, title, weekLabel) {
  const scheduleCount = computeSchedule(block.startDate, block.trainingDays).length;
  const endDate = addDays(block.startDate, 27);

  const players = block.memberIds.map((playerId, indexInBlock) => {
    // We deliberately do NOT select username here — it's an internal handle and
    // must not appear in a publicly shareable snapshot. See toPublicName().
    const s = db.prepare('SELECT player_name, position FROM settings WHERE user_id = ?').get(playerId) || {};

    // Benchmark phases (same logic as BlockDetail — pure date-window derivation).
    const phases = {};
    for (const phase of ['baseline', 'retest_1', 'retest_2']) {
      const w = windowFor(phase, block.startDate);
      phases[phase] = {
        lspt: findBenchmark(db, playerId, 'lspt', w),
        lsst: findBenchmark(db, playerId, 'lsst', w),
      };
    }

    // Assigned plans and session completion for the block window.
    const assigned = db.prepare(`
      SELECT date FROM assigned_plans
      WHERE coach_id = ? AND player_id = ? AND date BETWEEN ? AND ?
    `).all(block.coachId, playerId, block.startDate, endDate);
    const assignedDates = assigned.map(a => a.date);
    const completed = assignedDates.length === 0 ? 0 : db.prepare(`
      SELECT COUNT(DISTINCT date) AS c FROM sessions
      WHERE user_id = ? AND date IN (${assignedDates.map(() => '?').join(',')})
    `).get(playerId, ...assignedDates).c;

    // Session-count delta — half-of-block vs half-of-block. This is a TRAINING
    // ACTIVITY signal, not a Pace claim. Real Pace lives in the in-app surfaces.
    const midpoint = addDays(block.startDate, 14);
    const firstHalf = db.prepare(
      'SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND date BETWEEN ? AND ?'
    ).get(playerId, block.startDate, addDays(midpoint, -1)).c;
    const secondHalf = db.prepare(
      'SELECT COUNT(*) AS c FROM sessions WHERE user_id = ? AND date BETWEEN ? AND ?'
    ).get(playerId, midpoint, endDate).c;
    const activity =
      (firstHalf === 0 && secondHalf === 0) ? null :
      secondHalf > firstHalf ? 'increased' :
      secondHalf < firstHalf ? 'decreased' : 'steady';

    const publicName = toPublicName(s.player_name, indexInBlock);
    const baselineDone = !!(phases.baseline.lspt && phases.baseline.lsst);

    // Benchmark deltas (baseline → latest retest with data).
    const latestLspt = phases.retest_2.lspt || phases.retest_1.lspt;
    const latestLsst = phases.retest_2.lsst || phases.retest_1.lsst;
    const deltaLspt = (phases.baseline.lspt && latestLspt)
      ? Number((latestLspt.score - phases.baseline.lspt.score).toFixed(1)) : null;
    const deltaLsst = (phases.baseline.lsst && latestLsst)
      ? Number((latestLsst.score - phases.baseline.lsst.score).toFixed(1)) : null;

    return {
      // Field is still named `displayName` for snapshot-shape stability — the
      // PublicDigest UI reads p.displayName. The VALUE is now privacy-safe.
      displayName: publicName,
      position: parsePrimaryPosition(s.position),
      sessionsAssigned: scheduleCount,
      sessionsCompleted: completed,
      baselineDone,
      retest1Done: !!(phases.retest_1.lspt && phases.retest_1.lsst),
      retest2Done: !!(phases.retest_2.lspt && phases.retest_2.lsst),
      deltaLspt,
      deltaLsst,
      oneLiner: composeOneLiner({ publicName, sessionsAssigned: scheduleCount, sessionsCompleted: completed, baselineDone, activity }),
    };
  });

  const totalAssigned = players.reduce((a, p) => a + p.sessionsAssigned, 0);
  const totalCompleted = players.reduce((a, p) => a + p.sessionsCompleted, 0);
  const compliancePct = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : null;

  const baselineComplete = players.filter(p => p.baselineDone).length;
  const retest1Complete = players.filter(p => p.retest1Done).length;
  const retest2Complete = players.filter(p => p.retest2Done).length;

  return {
    version: 1,
    title,
    weekLabel: weekLabel || null,
    block: {
      name: block.name,
      startDate: block.startDate,
      endDate,
      trainingDays: block.trainingDays,
    },
    generatedAt: new Date().toISOString(),
    generatedByCoachName: coachDisplayName,
    summary: {
      playerCount: players.length,
      sessionsAssigned: totalAssigned,
      sessionsCompleted: totalCompleted,
      compliancePct,
      baselineComplete,
      retest1Complete,
      retest2Complete,
    },
    players,
  };
}

function blockRowToBlock(row) {
  return {
    id: row.id,
    coachId: row.coach_id,
    name: row.name,
    startDate: row.start_date,
    trainingDays: JSON.parse(row.training_days || '[]'),
    memberIds: JSON.parse(row.member_ids || '[]'),
  };
}

// ── Coach-authenticated router (mounted at /api/blocks/:blockId/digests) ──

export const coachDigestsRouter = Router({ mergeParams: true });

// POST /api/blocks/:blockId/digests  → create a new digest snapshot
coachDigestsRouter.post('/', requireCoach, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM blocks WHERE id = ?').get(req.params.blockId);
  if (!row) return res.status(404).json({ error: 'Block not found', code: 'NOT_FOUND' });
  if (row.coach_id !== req.userId) return res.status(403).json({ error: 'Not your block', code: 'FORBIDDEN' });

  const { title, weekLabel } = req.body || {};
  const cleanTitle = (typeof title === 'string' && title.trim().length > 0 && title.length <= 200)
    ? title.trim() : row.name;
  const cleanWeekLabel = (typeof weekLabel === 'string' && weekLabel.trim().length > 0 && weekLabel.length <= 80)
    ? weekLabel.trim() : null;

  const block = blockRowToBlock(row);
  const coach = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId);
  const coachSettings = db.prepare('SELECT player_name FROM settings WHERE user_id = ?').get(req.userId);
  const coachName = coachSettings?.player_name || coach?.username || 'Your coach';

  const snapshot = buildSnapshot(db, block, coachName, cleanTitle, cleanWeekLabel);

  const id = crypto.randomUUID();
  const slug = crypto.randomBytes(16).toString('base64url'); // 22 chars, 128 bits

  try {
    db.prepare(`
      INSERT INTO block_digests (id, block_id, coach_id, slug, title, week_label, snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, block.id, req.userId, slug, cleanTitle, cleanWeekLabel, JSON.stringify(snapshot));
  } catch (err) {
    logger.error('Digest create failed', { error: err.message });
    return res.status(500).json({ error: 'Could not create digest', code: 'DIGEST_CREATE_FAILED' });
  }

  emit('weekly_digest_generated', {
    userId: req.userId,
    role: 'coach',
    properties: { blockId: block.id, digestId: id, slug },
  });

  res.status(201).json({
    id,
    slug,
    title: cleanTitle,
    weekLabel: cleanWeekLabel,
    createdAt: new Date().toISOString(),
    revokedAt: null,
  });
});

// GET /api/blocks/:blockId/digests  → list this block's digests (coach only)
coachDigestsRouter.get('/', requireCoach, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT coach_id FROM blocks WHERE id = ?').get(req.params.blockId);
  if (!row) return res.status(404).json({ error: 'Block not found', code: 'NOT_FOUND' });
  if (row.coach_id !== req.userId) return res.status(403).json({ error: 'Not your block', code: 'FORBIDDEN' });

  const rows = db.prepare(`
    SELECT id, slug, title, week_label, created_at, revoked_at
    FROM block_digests WHERE block_id = ? ORDER BY created_at DESC
  `).all(req.params.blockId);

  res.json(rows.map(r => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    weekLabel: r.week_label,
    createdAt: r.created_at,
    revokedAt: r.revoked_at,
  })));
});

// DELETE /api/blocks/:blockId/digests/:id  → revoke
coachDigestsRouter.delete('/:id', requireCoach, (req, res) => {
  const db = getDb();
  const digest = db.prepare('SELECT * FROM block_digests WHERE id = ?').get(req.params.id);
  if (!digest) return res.status(404).json({ error: 'Digest not found', code: 'NOT_FOUND' });
  if (digest.coach_id !== req.userId) return res.status(403).json({ error: 'Not your digest', code: 'FORBIDDEN' });
  db.prepare("UPDATE block_digests SET revoked_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Public router (mounted at /api/public) ──
// No auth. Rate-limited by the global /api limiter already in server/index.js.

export const publicDigestsRouter = Router();

publicDigestsRouter.get('/digest/:slug', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM block_digests WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  if (row.revoked_at) return res.status(410).json({ error: 'Revoked', code: 'REVOKED' });
  // Snapshot is already JSON. Parse once so the client gets a pure object.
  let snapshot;
  try { snapshot = JSON.parse(row.snapshot); }
  catch { return res.status(500).json({ error: 'Corrupt snapshot', code: 'CORRUPT' }); }
  res.json({
    slug: row.slug,
    title: row.title,
    weekLabel: row.week_label,
    createdAt: row.created_at,
    snapshot,
  });
});

// POST /api/public/digest/:slug/opened — fire-and-forget telemetry from the
// unauthenticated viewer. No payload required. Validates slug exists and is
// not revoked before emitting, so bots can't spam arbitrary digestIds.
publicDigestsRouter.post('/digest/:slug/opened', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT id, block_id, revoked_at FROM block_digests WHERE slug = ?')
    .get(req.params.slug);
  if (!row || row.revoked_at) return res.status(204).end();
  emit('weekly_digest_opened', {
    userId: null,
    role: 'public',
    properties: { blockId: row.block_id, digestId: row.id },
  });
  res.status(204).end();
});
