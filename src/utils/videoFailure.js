// Centralized video-failure humanization.
//
// VideoUpload has six `failWithFallback(msg)` call sites with inconsistent copy,
// some of which include raw backend strings like "Gemini video processing failed".
// This helper normalizes any raw error into calm, consistent user-facing copy.
//
// Returns: { headline, subtext, recoverCta }
//
//   headline    — short calm sentence, never shows API names or codes
//   subtext     — "You can log this session manually" variation
//   recoverCta  — button text for the recover-into-manual CTA

// Strings we specifically know mean "AI couldn't analyze" — map to calmer copy.
const AI_FAILURE_PATTERNS = [
  /gemini/i,
  /ai couldn'?t analyze/i,
  /analysis failed/i,
  /analysis is taking too long/i,
  /no video or frames found/i,
];

const TIMEOUT_PATTERNS = [
  /abort/i,
  /timeout/i,
  /taking too long/i,
];

const NETWORK_PATTERNS = [
  /network/i,
  /lost connection/i,
  /failed to fetch/i,
  /reconnecting/i,
];

/**
 * Humanize a raw error message or AbortError name.
 * @param {string|Error|null} raw
 * @returns {{ headline: string, subtext: string, recoverCta: string }}
 */
export function humanizeVideoError(raw) {
  const msg = raw instanceof Error ? (raw.message || raw.name || '') : (raw || '');

  if (TIMEOUT_PATTERNS.some(rx => rx.test(msg))) {
    return {
      headline: 'AI analysis took too long.',
      subtext: 'You can finish logging this session manually.',
      recoverCta: 'Log manually',
    };
  }
  if (NETWORK_PATTERNS.some(rx => rx.test(msg))) {
    return {
      headline: 'Lost connection during upload.',
      subtext: 'Your session isn\'t gone — log it manually while you\'re here.',
      recoverCta: 'Log manually',
    };
  }
  if (AI_FAILURE_PATTERNS.some(rx => rx.test(msg)) || msg.length > 0) {
    return {
      headline: 'AI couldn\'t analyze this video.',
      subtext: 'You can finish logging this session manually.',
      recoverCta: 'Log manually',
    };
  }
  // Truly unknown — keep it calm.
  return {
    headline: 'Something went wrong with the video.',
    subtext: 'You can finish logging this session manually.',
    recoverCta: 'Log manually',
  };
}

// Custom event name used by the banner to tell App.jsx to route into the manual
// session logger. Payload includes whatever partial data VideoUpload captured
// before the failure. App.jsx installs a single listener.
export const RECOVER_MANUAL_EVENT = 'composed:recover-manual';
