/**
 * getPaceCelebrationState — picks the right headline for the post-session Pace beat.
 *
 * Pure function. Four states, one winner. The copy should sound like a training
 * partner noticing something real, not a product manager writing a notification.
 *
 * @param {Object} opts
 * @param {Object|null} opts.prePace  — computePace() result BEFORE this session
 * @param {Object|null} opts.postPace — computePace() result AFTER this session
 * @param {string|null} opts.identityLabel — e.g. "Scorer", or null for no identity
 * @param {number}      opts.sessionsThisWeek — count of sessions this week (including the new one)
 * @param {number}      opts.weeklyGoal — the player's weekly session goal
 * @param {boolean}     opts.isFirstSessionEver — true if this was the very first session
 * @returns {{ kind: 'A'|'B'|'C'|'D', headline: string, subline?: string, showSeeWhy: boolean }}
 */
export function getPaceCelebrationState({
  prePace,
  postPace,
  identityLabel,
  sessionsThisWeek = 0,
  weeklyGoal = 3,
  isFirstSessionEver = false,
}) {
  const prefix = identityLabel ? `Your ${identityLabel}'s Pace` : 'Your Pace';

  // State D — brand new, no prior Pace at all
  if (!postPace || postPace.overall.velocityPct == null) {
    return {
      kind: 'D',
      headline: "First session logged — your Pace will appear after you've trained a second week.",
      showSeeWhy: false,
    };
  }

  const postLabel = postPace.overall.label;
  const postVel = postPace.overall.velocityPct;
  const preLabel = prePace?.overall?.label || null;
  const preVel = prePace?.overall?.velocityPct ?? null;

  // No prior Pace to compare against (first meaningful week)
  if (preVel == null) {
    return {
      kind: 'D',
      headline: "First session logged — your Pace will appear after you've trained a second week.",
      showSeeWhy: false,
    };
  }

  const delta = Math.abs(postVel - preVel);
  const labelChanged = preLabel !== postLabel;

  // State A — Pace moved to a new label
  if (labelChanged) {
    const wentUp = postVel > preVel;
    const preNice = (preLabel || 'steady').toUpperCase();
    const postNice = (postLabel || 'steady').toUpperCase();

    if (wentUp) {
      return {
        kind: 'A',
        headline: `${prefix} just moved from ${preNice} to ${postNice}`,
        showSeeWhy: true,
      };
    }
    // Went down — honest but supportive
    return {
      kind: 'A',
      headline: `${prefix} moved from ${preNice} to ${postNice}. Keep training — trends recover.`,
      showSeeWhy: true,
    };
  }

  // State B — Pace moved within the same label (meaningful delta)
  if (delta >= 0.5) {
    const dir = postVel > preVel ? 'up' : 'down';
    const preStr = `${preVel > 0 ? '+' : ''}${preVel}%`;
    const postStr = `${postVel > 0 ? '+' : ''}${postVel}%`;
    return {
      kind: 'B',
      headline: `${prefix} is ${postLabel.toUpperCase()} ${postStr} (${dir} from ${preStr})`,
      showSeeWhy: true,
    };
  }

  // State C — Pace didn't move meaningfully
  if (isFirstSessionEver || sessionsThisWeek <= 1) {
    return {
      kind: 'C',
      headline: "First session this week. Your Pace updates as the week builds.",
      showSeeWhy: true,
    };
  }

  const remaining = weeklyGoal - sessionsThisWeek;
  if (remaining > 0 && postLabel !== 'accelerating') {
    return {
      kind: 'C',
      headline: `${remaining} more session${remaining !== 1 ? 's' : ''} this week to push ${prefix} higher.`,
      showSeeWhy: true,
    };
  }

  return {
    kind: 'C',
    headline: `${prefix} held ${postLabel.toUpperCase()}. Keep stacking sessions — trends build over weeks, not days.`,
    showSeeWhy: true,
  };
}
