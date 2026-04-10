/**
 * Pace System — Improvement Velocity Score
 *
 * Computes how fast a player is improving across key metrics.
 * Not "where are you?" but "are you getting better fast enough?"
 */

import {
  getAverageStat, getShotPercentage, getPassPercentage,
  getWeeklyLoads, getCurrentWeekSessionCount,
} from './stats';

const MIN_SESSIONS = 5;

// Default metric weights for overall pace score (role-agnostic fallback)
const DEFAULT_WEIGHTS = {
  shooting: 0.25,
  passing: 0.20,
  consistency: 0.25,
  duration: 0.15,
  load: 0.15,
};

// Position-specific weights. Each position tilts the overall pace score toward the metrics
// that actually matter for that role. A striker who's improving on shooting should feel that
// acceleration more strongly; a CDM shouldn't be penalized for flat shot accuracy.
//
// All weight sets sum to 1.0. Consistency stays at 0.20-0.25 for every position — showing up
// is the universal input.
const POSITION_WEIGHTS = {
  Striker:  { shooting: 0.40, passing: 0.10, consistency: 0.20, duration: 0.10, load: 0.20 },
  Winger:   { shooting: 0.25, passing: 0.15, consistency: 0.20, duration: 0.15, load: 0.25 },
  CAM:      { shooting: 0.25, passing: 0.30, consistency: 0.20, duration: 0.10, load: 0.15 },
  CDM:      { shooting: 0.05, passing: 0.35, consistency: 0.25, duration: 0.15, load: 0.20 },
  CB:       { shooting: 0.05, passing: 0.30, consistency: 0.25, duration: 0.20, load: 0.20 },
  GK:       { shooting: 0.05, passing: 0.15, consistency: 0.30, duration: 0.20, load: 0.30 },
  General:  DEFAULT_WEIGHTS,
};

function getWeightsForPosition(position) {
  if (!position) return DEFAULT_WEIGHTS;
  return POSITION_WEIGHTS[position] || DEFAULT_WEIGHTS;
}

// Thresholds for pace labels
const ACCELERATING_THRESHOLD = 2;  // > +2% = accelerating
const STALLING_THRESHOLD = -2;     // < -2% = stalling

/**
 * Get the label for a velocity percentage.
 */
function getPaceLabel(velocityPct) {
  if (velocityPct == null) return 'steady';
  if (velocityPct > ACCELERATING_THRESHOLD) return 'accelerating';
  if (velocityPct < STALLING_THRESHOLD) return 'stalling';
  return 'steady';
}

/**
 * Compute per-metric pace by comparing two consecutive time windows.
 */
function computeMetricPace(sessions, metricKey, numWeeks = 4) {
  if (sessions.length < MIN_SESSIONS) return null;

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const now = new Date();

  // Build weekly buckets (same logic as getWeeklyLoads)
  const weeks = [];
  for (let w = 0; w < numWeeks; w++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);
    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];
    const weekSessions = sorted.filter(s => s.date > startStr && s.date <= endStr);
    weeks.unshift({ startStr, endStr, sessions: weekSessions });
  }

  // Need at least 2 weeks with data
  const thisWeekSessions = weeks[weeks.length - 1]?.sessions || [];
  const lastWeekSessions = weeks[weeks.length - 2]?.sessions || [];

  let thisWeekVal = null;
  let lastWeekVal = null;

  switch (metricKey) {
    case 'shooting':
      thisWeekVal = getAverageStat(thisWeekSessions, getShotPercentage);
      lastWeekVal = getAverageStat(lastWeekSessions, getShotPercentage);
      break;
    case 'passing':
      thisWeekVal = getAverageStat(thisWeekSessions, getPassPercentage);
      lastWeekVal = getAverageStat(lastWeekSessions, getPassPercentage);
      break;
    case 'consistency':
      thisWeekVal = thisWeekSessions.length;
      lastWeekVal = lastWeekSessions.length;
      break;
    case 'duration':
      thisWeekVal = thisWeekSessions.length > 0
        ? Math.round(thisWeekSessions.reduce((s, x) => s + (x.duration || 0), 0) / thisWeekSessions.length)
        : null;
      lastWeekVal = lastWeekSessions.length > 0
        ? Math.round(lastWeekSessions.reduce((s, x) => s + (x.duration || 0), 0) / lastWeekSessions.length)
        : null;
      break;
    case 'load':
      thisWeekVal = thisWeekSessions.reduce((s, x) => s + (x.duration || 0) * (x.fitness?.rpe || 5), 0);
      lastWeekVal = lastWeekSessions.reduce((s, x) => s + (x.duration || 0) * (x.fitness?.rpe || 5), 0);
      break;
  }

  if (thisWeekVal == null || lastWeekVal == null) return null;

  const velocity = thisWeekVal - lastWeekVal;
  const velocityPct = lastWeekVal !== 0
    ? Math.round((velocity / Math.abs(lastWeekVal)) * 100 * 10) / 10
    : velocity > 0 ? 100 : velocity < 0 ? -100 : 0;

  return {
    metricKey,
    thisWeek: thisWeekVal,
    lastWeek: lastWeekVal,
    velocity,
    velocityPct,
    label: getPaceLabel(velocityPct),
  };
}

/**
 * Find the worst performing metric and generate a specific recommendation.
 */
export function getPaceRecommendation(metrics) {
  const recommendations = {
    shooting: (m) => `Your shooting accuracy is ${m.label === 'stalling' ? 'stalling' : 'declining'} at ${m.thisWeek != null ? m.thisWeek + '%' : 'low data'}. Add 1 focused finishing drill this week.`,
    passing: (m) => `Your passing accuracy is ${m.label === 'stalling' ? 'stalling' : 'declining'}. Try adding a wall-pass session this week to build rhythm.`,
    consistency: (m) => `Your session frequency dropped from ${m.lastWeek} to ${m.thisWeek} this week. Aim for at least one more session to maintain momentum.`,
    duration: (m) => `Your average session length is declining. Even extending by 10 minutes compounds gains over time.`,
    load: (m) => `Your training load dropped ${Math.abs(m.velocityPct)}%. Consider increasing intensity slightly or adding 1 extra session.`,
  };

  const ranked = Object.values(metrics)
    .filter(m => m != null && m.velocityPct != null)
    .sort((a, b) => a.velocityPct - b.velocityPct);

  if (ranked.length === 0) return { text: 'Keep logging sessions to track your improvement pace.', metricKey: null, urgency: 'low' };

  const worst = ranked[0];

  if (worst.velocityPct >= ACCELERATING_THRESHOLD) {
    return { text: 'Great pace across all areas. Keep this momentum going — consistency is your superpower.', metricKey: null, urgency: 'low' };
  }

  const urgency = worst.velocityPct < -5 ? 'high' : worst.velocityPct < -2 ? 'medium' : 'low';
  const text = recommendations[worst.metricKey]?.(worst) || `Focus on improving your ${worst.metricKey} this week.`;

  return { text, metricKey: worst.metricKey, urgency };
}

/**
 * Main function: compute overall pace from all sessions.
 * Returns null if insufficient data.
 *
 * @param {array}  sessions  — session history
 * @param {number} [numWeeks] — number of weeks to consider (default 4)
 * @param {string} [position] — player's position ('Striker', 'CDM', etc). Shifts the
 *                              weighting so the score reflects what matters for that role.
 *                              Falls back to DEFAULT_WEIGHTS if omitted or unknown.
 */
export function computePace(sessions, numWeeks = 4, position) {
  if (!sessions || sessions.length < MIN_SESSIONS) return null;

  const weights = getWeightsForPosition(position);
  const metricKeys = ['shooting', 'passing', 'consistency', 'duration', 'load'];
  const metrics = {};

  for (const key of metricKeys) {
    metrics[key] = computeMetricPace(sessions, key, numWeeks);
  }

  // Weighted overall velocity (skip nulls, redistribute across available metrics)
  let totalWeight = 0;
  let weightedSum = 0;

  for (const key of metricKeys) {
    if (metrics[key]?.velocityPct != null) {
      weightedSum += metrics[key].velocityPct * weights[key];
      totalWeight += weights[key];
    }
  }

  const overallVelocityPct = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
  const overallLabel = getPaceLabel(overallVelocityPct);
  const recommendation = getPaceRecommendation(metrics);

  return {
    overall: {
      velocityPct: overallVelocityPct,
      label: overallLabel,
    },
    metrics,
    recommendation,
    position: position || null,
  };
}

/**
 * Generate a weekly pace report (for Monday morning card).
 */
export function generateWeeklyPaceReport(sessions, skillLevel) {
  const pace = computePace(sessions, 4);
  if (!pace) return null;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + mondayOffset);
  const weekOf = monday.toISOString().split('T')[0];

  const metricSummary = Object.entries(pace.metrics)
    .filter(([, m]) => m != null)
    .map(([key, m]) => ({
      name: { shooting: 'Shot %', passing: 'Pass %', consistency: 'Sessions', duration: 'Duration', load: 'Load' }[key],
      label: m.label,
      velocityPct: m.velocityPct,
    }));

  return {
    weekOf,
    overall: pace.overall,
    metrics: metricSummary,
    recommendation: pace.recommendation,
  };
}
