// First-party pilot instrumentation.
//
// `emit` writes a row to the `events` table. It's deliberately "fire and forget" —
// never throws, never blocks a request. If the DB insert fails we log it and move on,
// because dropping a telemetry event is infinitely better than failing a user's
// session-log request.
//
// Properties are free-form JSON. Only record what you would actually look at —
// no PII beyond the IDs we already have on the users table.
//
// The 14-event catalog (authoritative):
//   Server-side:
//     invite_code_created, onboarding_completed, coach_player_linked,
//     session_logged, assigned_plan_created, assigned_plan_completed,
//     video_analysis_started, video_analysis_completed
//   Client-side:
//     invite_link_opened, video_analysis_fallback_to_manual,
//     pace_audit_opened, coach_report_generated
//   Forward-looking (no emit site yet, reserved so the catalog stays complete):
//     weekly_digest_generated, weekly_digest_opened

import { getDb } from './db.js';
import { logger } from './logger.js';

const KNOWN_EVENTS = new Set([
  'invite_code_created',
  'onboarding_completed',
  'coach_player_linked',
  'session_logged',
  'assigned_plan_created',
  'assigned_plan_completed',
  'video_analysis_started',
  'video_analysis_completed',
  'invite_link_opened',
  'video_analysis_fallback_to_manual',
  'pace_audit_opened',
  'coach_report_generated',
  'weekly_digest_generated',
  'weekly_digest_opened',
]);

/**
 * Emit a pilot event.
 *
 * @param {string} eventName — must be in KNOWN_EVENTS
 * @param {object} opts
 * @param {number} [opts.userId]         — the actor
 * @param {number} [opts.relatedUserId]  — a secondary subject (e.g. player when a coach acts)
 * @param {string} [opts.role]           — 'player' | 'coach' | 'parent' | 'founder'
 * @param {object} [opts.properties]     — free-form, JSON-stringified before insert
 */
export function emit(eventName, opts = {}) {
  if (!KNOWN_EVENTS.has(eventName)) {
    // Logged but not thrown — silent drift is worse than a loud warning.
    logger.warn(`emit: unknown event '${eventName}' — add it to KNOWN_EVENTS`);
    return;
  }
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO events (event_name, user_id, related_user_id, role, properties)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      eventName,
      opts.userId ?? null,
      opts.relatedUserId ?? null,
      opts.role ?? null,
      opts.properties ? JSON.stringify(opts.properties) : null,
    );
  } catch (err) {
    // Telemetry failures must never break the host request. Log and move on.
    logger.warn('emit failed', { eventName, error: err.message });
  }
}

export { KNOWN_EVENTS };
