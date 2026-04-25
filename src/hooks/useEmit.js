// Client-side emit helper for pilot instrumentation.
//
// `emit(eventName, properties?)` POSTs to /api/events. Fire-and-forget — errors are
// swallowed so telemetry can never break a user flow. The server enforces an allowlist
// of client-permitted event names.
//
// Three client events:
//   - invite_link_opened                   — a player clicks a shared invite link
//   - video_analysis_fallback_to_manual    — the pipeline fails and the user keeps logging manually
//   - pace_audit_opened                    — user taps "Audit Pace" on a detail view
//   - coach_report_generated               — coach produces a shareable report
//
// (weekly_digest_opened is reserved but not yet wired.)

import { apiFetch } from './useApi.js';

export function emit(eventName, properties = null) {
  // Don't await — pilot events must never block the UI. If the request fails,
  // that's fine; we'd rather drop an event than stall the user.
  apiFetch('/events', {
    method: 'POST',
    body: { event: eventName, properties },
  }).catch(() => { /* swallow */ });
}

// React convenience: gives you a stable emit function that doesn't need re-wiring
// on each render. Returns the same `emit` above — the hook form exists only so
// consumers can write `const emit = useEmit()` idiomatically.
export function useEmit() {
  return emit;
}
