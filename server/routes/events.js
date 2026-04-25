// Pilot instrumentation API.
//
// Three endpoints:
//   POST /api/events                — authenticated client emit (rate-limited)
//   GET  /api/events/metrics        — founder-only, aggregate summary for a dashboard
//   GET  /api/events/export         — founder-only, CSV download for offline analysis
//
// Access control: `FOUNDER_USERNAME` env var names the single account allowed to read
// metrics. If unset in dev, any coach can read (logged, so it's visible); in prod, unset
// means the metrics endpoints are hard-locked.

import { Router } from 'express';
import { getDb } from '../db.js';
import { logger } from '../logger.js';
import { emit, KNOWN_EVENTS } from '../events.js';

const router = Router();

// ── Founder gate ───────────────────────────────────────────────────────────
// The founder is identified by username (not ID — IDs change between environments).
// If FOUNDER_USERNAME isn't set, we refuse access in prod and log a warning in dev.
function requireFounder(req, res, next) {
  const founder = process.env.FOUNDER_USERNAME;
  if (!founder) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Metrics disabled', code: 'FOUNDER_NOT_CONFIGURED' });
    }
    logger.warn('FOUNDER_USERNAME not set — /api/events/metrics open to any coach in dev');
    if (req.userRole !== 'coach') {
      return res.status(403).json({ error: 'Coach access required', code: 'FORBIDDEN' });
    }
    return next();
  }
  const db = getDb();
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId);
  if (!user || user.username !== founder) {
    return res.status(403).json({ error: 'Founder access required', code: 'FORBIDDEN' });
  }
  next();
}

// ── Client emit ───────────────────────────────────────────────────────────
// Allowlist of events the client is permitted to emit. Any other event name coming
// from the client is rejected — server-authored events must originate on the server.
const CLIENT_EMIT_ALLOWLIST = new Set([
  'invite_link_opened',
  'video_analysis_fallback_to_manual',
  'pace_audit_opened',
  'coach_report_generated',
  'weekly_digest_opened',
]);

// POST /api/events — client emits an event. Body: { event, properties? }
router.post('/', (req, res) => {
  const { event, properties } = req.body || {};
  if (!event || typeof event !== 'string') {
    return res.status(400).json({ error: 'event required', code: 'MISSING_EVENT' });
  }
  if (!CLIENT_EMIT_ALLOWLIST.has(event)) {
    // Not in the allowlist: either unknown, or server-only. Don't leak which.
    return res.status(400).json({ error: 'Event not permitted from client', code: 'FORBIDDEN_EVENT' });
  }
  // properties must be a plain object if provided — reject arrays/primitives.
  const safeProps = properties && typeof properties === 'object' && !Array.isArray(properties)
    ? { ...properties }
    : {};

  // Opportunistic block attribution for events the client can't identify on its own.
  // Only set when the user is in exactly one active block today — "null is better
  // than wrong" otherwise.
  if (!safeProps.blockId && req.userId && (
    event === 'video_analysis_fallback_to_manual' ||
    event === 'pace_audit_opened'
  )) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const db = getDb();
      const matches = db.prepare(`
        SELECT b.id FROM blocks b
        WHERE b.status = 'active'
          AND ? BETWEEN b.start_date AND date(b.start_date, '+27 days')
          AND EXISTS (SELECT 1 FROM json_each(b.member_ids) je WHERE je.value = ?)
      `).all(today, req.userId);
      if (matches.length === 1) safeProps.blockId = matches[0].id;
    } catch { /* ignore — leave null */ }
  }

  emit(event, {
    userId: req.userId,
    role: req.userRole,
    properties: Object.keys(safeProps).length > 0 ? safeProps : null,
  });
  res.status(202).json({ ok: true });
});

// ── Founder metrics (JSON summary) ─────────────────────────────────────────

// GET /api/events/metrics
// Returns:
//   { totalEvents, uniqueUsers, byEvent: { [name]: { total, last7d } }, lastEvents: [{...}] }
//
// Deliberately simple — this is a founder-only dashboard, not an analytics product.
//
// When ?blockId= is provided, response also includes { pilotTruth: {...} } computed
// from source-of-truth tables (blocks, coach_players, sessions, benchmarks,
// assigned_plans, video_analyses) joined with event counts where relevant.
router.get('/metrics', requireFounder, (req, res) => {
  const db = getDb();

  const total = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  const uniqueUsers = db.prepare('SELECT COUNT(DISTINCT user_id) AS c FROM events WHERE user_id IS NOT NULL').get().c;

  // Per-event counts (all-time + last-7-days) in a single scan each.
  // SQLite doesn't have FILTER on older builds, but it has CASE — use CASE for the 7d subset.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const rows = db.prepare(`
    SELECT
      event_name,
      COUNT(*) AS total,
      SUM(CASE WHEN occurred_at >= ? THEN 1 ELSE 0 END) AS last7d
    FROM events
    GROUP BY event_name
  `).all(sevenDaysAgo);

  // Ensure every known event shows up (even zero-count) so the dashboard doesn't
  // mysteriously omit events that haven't fired yet — this is the whole point of
  // a catalog: visibility into what we *expect* to see.
  const byEvent = {};
  for (const name of KNOWN_EVENTS) {
    byEvent[name] = { total: 0, last7d: 0 };
  }
  for (const r of rows) {
    byEvent[r.event_name] = { total: r.total, last7d: r.last7d || 0 };
  }

  // Last 50 events for a quick eyeball of recent activity.
  const lastEvents = db.prepare(`
    SELECT e.event_name, e.occurred_at, e.user_id, e.role, e.properties, u.username
    FROM events e
    LEFT JOIN users u ON u.id = e.user_id
    ORDER BY e.occurred_at DESC
    LIMIT 50
  `).all().map(r => ({
    event: r.event_name,
    occurredAt: r.occurred_at,
    userId: r.user_id,
    username: r.username,
    role: r.role,
    properties: r.properties ? safeParseJSON(r.properties) : null,
  }));

  const response = { totalEvents: total, uniqueUsers, byEvent, lastEvents };

  // Also include the list of available blocks so the founder UI has a selector
  // without a second round-trip. Lightweight — just id/name/coach.
  response.blocks = db.prepare(`
    SELECT b.id, b.name, b.start_date, b.status, u.username AS coach_username
    FROM blocks b JOIN users u ON u.id = b.coach_id
    ORDER BY b.created_at DESC
  `).all().map(b => ({
    id: b.id, name: b.name, startDate: b.start_date, status: b.status, coachUsername: b.coach_username,
  }));

  // Block-scoped pilot truth section.
  if (req.query.blockId && typeof req.query.blockId === 'string') {
    response.pilotTruth = computePilotTruth(db, req.query.blockId);
  }

  res.json(response);
});

// Source-of-truth snapshot for a block. Reads live tables, not events — events
// are just one signal among many and can have attribution gaps.
function computePilotTruth(db, blockId) {
  const block = db.prepare('SELECT * FROM blocks WHERE id = ?').get(blockId);
  if (!block) return { error: 'Block not found' };
  const memberIds = JSON.parse(block.member_ids || '[]');
  if (memberIds.length === 0) return { error: 'Block has no members' };

  const endDate = addDays(block.start_date, 27);
  const placeholders = memberIds.map(() => '?').join(',');

  // Activation
  const invited = memberIds.length;
  const linked = db.prepare(
    `SELECT COUNT(DISTINCT player_id) AS c FROM coach_players
     WHERE coach_id = ? AND player_id IN (${placeholders})`
  ).get(block.coach_id, ...memberIds).c;
  const onboarded = db.prepare(
    `SELECT COUNT(*) AS c FROM settings
     WHERE user_id IN (${placeholders}) AND onboarding_complete = 1`
  ).all ? db.prepare(
    `SELECT COUNT(*) AS c FROM settings
     WHERE user_id IN (${placeholders}) AND onboarding_complete = 1`
  ).get(...memberIds).c : 0;
  const firstSessionCompleted = db.prepare(
    `SELECT COUNT(DISTINCT user_id) AS c FROM sessions WHERE user_id IN (${placeholders})`
  ).get(...memberIds).c;

  // Training loop — in the block window, attributable to this coach/member set
  const sessionsAssigned = db.prepare(
    `SELECT COUNT(*) AS c FROM assigned_plans
     WHERE coach_id = ? AND player_id IN (${placeholders})
     AND date BETWEEN ? AND ?`
  ).get(block.coach_id, ...memberIds, block.start_date, endDate).c;
  // Count distinct (player,date) sessions in-window that match an assigned date
  const sessionsCompleted = db.prepare(
    `SELECT COUNT(*) AS c FROM sessions s
     WHERE s.user_id IN (${placeholders})
     AND s.date BETWEEN ? AND ?
     AND EXISTS (
       SELECT 1 FROM assigned_plans ap
       WHERE ap.coach_id = ? AND ap.player_id = s.user_id AND ap.date = s.date
     )`
  ).get(...memberIds, block.start_date, endDate, block.coach_id).c;
  const compliancePct = sessionsAssigned > 0
    ? Math.round((sessionsCompleted / sessionsAssigned) * 100) : null;

  // Video pipeline — from video_analyses table + events (fallback is event-only)
  const videoSessions = db.prepare(
    `SELECT COUNT(*) AS c FROM video_analyses
     WHERE user_id IN (${placeholders}) AND created_at >= ?`
  ).get(...memberIds, block.start_date + ' 00:00:00').c;
  // Manual sessions = total block-window sessions − video sessions (approximate)
  const totalBlockSessions = db.prepare(
    `SELECT COUNT(*) AS c FROM sessions
     WHERE user_id IN (${placeholders}) AND date BETWEEN ? AND ?`
  ).get(...memberIds, block.start_date, endDate).c;
  const manualSessions = Math.max(0, totalBlockSessions - videoSessions);
  // Fallback count: events with this blockId in properties
  const videoFallbackCount = db.prepare(
    `SELECT COUNT(*) AS c FROM events
     WHERE event_name = 'video_analysis_fallback_to_manual'
     AND json_extract(properties, '$.blockId') = ?`
  ).get(blockId).c;

  // Benchmarks — same date-window logic the block detail uses
  const baselineWin = { from: addDays(block.start_date, -7), to: addDays(block.start_date, 7) };
  const retest1Win = { from: addDays(block.start_date, 9), to: addDays(block.start_date, 19) };
  const retest2Win = { from: addDays(block.start_date, 23), to: addDays(block.start_date, 33) };

  // A "phase complete" for a player = has BOTH lspt and lsst in that window
  const countPhaseComplete = (win) => db.prepare(`
    SELECT COUNT(*) AS c FROM (
      SELECT user_id
      FROM benchmarks
      WHERE user_id IN (${placeholders})
        AND date BETWEEN ? AND ?
        AND type IN ('lspt','lsst')
      GROUP BY user_id
      HAVING COUNT(DISTINCT type) = 2
    )
  `).get(...memberIds, win.from, win.to).c;
  const baselineComplete = countPhaseComplete(baselineWin);
  const retest1Complete = countPhaseComplete(retest1Win);
  const retest2Complete = countPhaseComplete(retest2Win);

  // Digests — from block_digests table + events
  const digestGenerated = db.prepare(
    'SELECT COUNT(*) AS c FROM block_digests WHERE block_id = ?'
  ).get(blockId).c;
  const digestOpened = db.prepare(
    `SELECT COUNT(*) AS c FROM events
     WHERE event_name = 'weekly_digest_opened'
     AND json_extract(properties, '$.blockId') = ?`
  ).get(blockId).c;

  return {
    block: { id: blockId, name: block.name, startDate: block.start_date, endDate },
    activation: { invited, linked, onboarded, firstSessionCompleted },
    training: { sessionsAssigned, sessionsCompleted, compliancePct },
    video: { manualSessions, videoSessions, videoFallbackCount },
    benchmarks: { baselineComplete, retest1Complete, retest2Complete, memberCount: memberIds.length },
    digests: { generated: digestGenerated, opened: digestOpened },
  };
}

// Tiny date helper — duplicated here to avoid importing from blocks.js
function addDays(yyyymmdd, days) {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

// ── Founder CSV export ─────────────────────────────────────────────────────

// GET /api/events/export?event=session_logged&from=2026-04-01&to=2026-05-01
// All params optional. Returns CSV with columns:
//   id,event_name,occurred_at,user_id,username,role,related_user_id,properties
router.get('/export', requireFounder, (req, res) => {
  // blockId filter: uses SQLite json_extract on properties. O(N) scan but fine
  // at pilot scale.
  const db = getDb();
  const { event, from, to, blockId } = req.query;

  const clauses = [];
  const params = [];
  if (event && typeof event === 'string') { clauses.push('e.event_name = ?'); params.push(event); }
  if (from && typeof from === 'string')   { clauses.push('e.occurred_at >= ?'); params.push(from); }
  if (to && typeof to === 'string')       { clauses.push('e.occurred_at <= ?'); params.push(to); }
  if (blockId && typeof blockId === 'string') {
    clauses.push("json_extract(e.properties, '$.blockId') = ?");
    params.push(blockId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT e.id, e.event_name, e.occurred_at, e.user_id, u.username, e.role,
           e.related_user_id, e.properties
    FROM events e
    LEFT JOIN users u ON u.id = e.user_id
    ${where}
    ORDER BY e.occurred_at ASC
  `).all(...params);

  const header = 'id,event_name,occurred_at,user_id,username,role,related_user_id,properties\n';
  const body = rows.map(r => [
    r.id,
    csvEscape(r.event_name),
    csvEscape(r.occurred_at),
    r.user_id ?? '',
    csvEscape(r.username ?? ''),
    csvEscape(r.role ?? ''),
    r.related_user_id ?? '',
    csvEscape(r.properties ?? ''),
  ].join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="events-${Date.now()}.csv"`);
  res.send(header + body);
});

// ── helpers ────────────────────────────────────────────────────────────────

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  // Per RFC 4180: wrap in quotes if the value contains comma, quote, or newline.
  // Escape inner quotes by doubling them.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function safeParseJSON(s) {
  try { return JSON.parse(s); } catch { return s; }
}

export default router;
