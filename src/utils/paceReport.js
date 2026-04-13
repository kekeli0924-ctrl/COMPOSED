/**
 * paceReport.js — Shared helpers for Pace-related reporting surfaces.
 *
 * Extracted from PaceAuditView.jsx so both the audit view and the Coach Report
 * can reuse the same logic. Contains:
 *   - POSITION_WEIGHTS — position-specific metric weight table
 *   - METRIC_NAMES / METRIC_UNITS — human-friendly labels
 *   - formatMetricValue() — format a metric value for display
 *   - generatePlainEnglishSummary() — the "why Pace moved" sentence
 *   - gatherCoachReportData() — assembles the full Coach Report data object
 */

import { computePace } from './pace';
import { getIdentity, hasAnyIdentity, getIdentityLabels } from './identity';
import { getStreak } from './stats';

// ── Position weight table ────────────────────────────────────────────────────
// Mirrors the weights in pace.js. If pace.js ever exports POSITION_WEIGHTS,
// this should import from there instead.
export const POSITION_WEIGHTS = {
  Striker:  { shooting: 0.40, passing: 0.10, consistency: 0.20, duration: 0.10, load: 0.20 },
  Winger:   { shooting: 0.25, passing: 0.15, consistency: 0.20, duration: 0.15, load: 0.25 },
  CAM:      { shooting: 0.25, passing: 0.30, consistency: 0.20, duration: 0.10, load: 0.15 },
  CDM:      { shooting: 0.05, passing: 0.35, consistency: 0.25, duration: 0.15, load: 0.20 },
  CB:       { shooting: 0.05, passing: 0.30, consistency: 0.25, duration: 0.20, load: 0.20 },
  GK:       { shooting: 0.05, passing: 0.15, consistency: 0.30, duration: 0.20, load: 0.30 },
  Fullback: { shooting: 0.10, passing: 0.20, consistency: 0.25, duration: 0.15, load: 0.30 },
  CM:       { shooting: 0.10, passing: 0.30, consistency: 0.25, duration: 0.15, load: 0.20 },
  General:  { shooting: 0.25, passing: 0.20, consistency: 0.25, duration: 0.15, load: 0.15 },
};

export const METRIC_NAMES = {
  shooting: 'Shot accuracy',
  passing: 'Pass completion',
  consistency: 'Sessions per week',
  duration: 'Avg session length',
  load: 'Training load',
};

export const METRIC_UNITS = {
  shooting: '%',
  passing: '%',
  consistency: '',
  duration: 'min',
  load: '',
};

// NOTE: computeMetricPace returns shooting/passing values that are already
// percentages (e.g. 31 for 31%, not 0.31). Do NOT multiply by 100 again.
export function formatMetricValue(key, value) {
  if (value == null) return '—';
  if (key === 'shooting' || key === 'passing') return `${Math.round(value)}%`;
  if (key === 'duration') return `${Math.round(value)} min`;
  if (key === 'consistency') return `${value} session${value !== 1 ? 's' : ''}`;
  if (key === 'load') return `${Math.round(value)}`;
  return `${value}`;
}

// ── Plain-English sentence generator ─────────────────────────────────────────
export function generatePlainEnglishSummary(pace) {
  if (!pace) return null;

  const { overall, metrics } = pace;
  if (overall.velocityPct == null) {
    return "Pace will start showing trends after a second week of training.";
  }

  const weights = POSITION_WEIGHTS[pace.position] || POSITION_WEIGHTS.General;
  const movers = Object.entries(metrics)
    .filter(([, m]) => m != null && m.velocityPct != null)
    .map(([key, m]) => ({
      key,
      name: METRIC_NAMES[key],
      velocity: m.velocityPct,
      weight: weights[key] || 0,
      impact: Math.abs(m.velocityPct) * (weights[key] || 0),
      thisWeek: m.thisWeek,
      lastWeek: m.lastWeek,
    }))
    .sort((a, b) => b.impact - a.impact);

  if (movers.length === 0) {
    return "Not enough metric data to explain the movement yet.";
  }

  const delta = overall.velocityPct;
  const absDelta = Math.abs(delta);
  if (absDelta < 1) return "Pace is roughly the same as last week — key metrics held steady.";

  const top = movers.slice(0, 2);
  const direction = delta > 0 ? 'went up' : 'dropped';

  const describeMove = (m) => {
    if (m.key === 'consistency') {
      const diff = (m.thisWeek || 0) - (m.lastWeek || 0);
      if (diff > 0) return `${diff} more session${diff > 1 ? 's' : ''} this week`;
      if (diff < 0) return `${Math.abs(diff)} fewer session${Math.abs(diff) > 1 ? 's' : ''} this week`;
      return 'session count held steady';
    }
    if (m.key === 'shooting' || m.key === 'passing') {
      const from = m.lastWeek != null ? `${Math.round(m.lastWeek)}%` : '—';
      const to = m.thisWeek != null ? `${Math.round(m.thisWeek)}%` : '—';
      const label = m.key === 'shooting' ? 'shot accuracy' : 'pass completion';
      return m.velocity > 0 ? `${label} improved from ${from} to ${to}` : `${label} dropped from ${from} to ${to}`;
    }
    if (m.key === 'duration') {
      const from = m.lastWeek != null ? `${Math.round(m.lastWeek)}m` : '—';
      const to = m.thisWeek != null ? `${Math.round(m.thisWeek)}m` : '—';
      return m.velocity > 0 ? `avg session grew from ${from} to ${to}` : `avg session shrank from ${from} to ${to}`;
    }
    if (m.key === 'load') return m.velocity > 0 ? 'training volume increased' : 'training volume decreased';
    return `${m.name.toLowerCase()} ${m.velocity > 0 ? 'improved' : 'declined'}`;
  };

  if (top.length === 1) return `Pace ${direction} because ${describeMove(top[0])}.`;
  return `Pace ${direction} because ${describeMove(top[0])} and ${describeMove(top[1])}.`;
}

// ── Coach Report data gatherer ───────────────────────────────────────────────
// Assembles the full structured object for the Coach Report image renderer.
// Pure function — no rendering, no side effects.
export function gatherCoachReportData({
  sessions = [],
  settings = {},
  idpGoals = [],
  parentVisibility = {},
}) {
  const position = (Array.isArray(settings.position) && settings.position[0]) || 'General';
  const pace = computePace(sessions, 4, position);

  const identityLabels = getIdentityLabels(settings.playerIdentity);
  const identityConfig = getIdentity(settings.playerIdentity);
  const hasIdentity = hasAnyIdentity(settings.playerIdentity);

  // 4-week window
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];
  const nowStr = now.toISOString().split('T')[0];

  const recentSessions = sessions.filter(s => s.date >= fourWeeksAgoStr);
  const streak = getStreak(sessions);

  // Week-by-week session counts (last 4 weeks, most recent first)
  const weekCounts = [];
  for (let w = 0; w < 4; w++) {
    const end = new Date(now);
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const count = sessions.filter(s => s.date > startStr && s.date <= endStr).length;
    weekCounts.push({ week: w === 0 ? 'This wk' : w === 1 ? 'Last wk' : `${w}w ago`, count });
  }
  weekCounts.reverse(); // oldest first for display

  const totalTime = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Top metrics that moved (sorted by position weight, highest first)
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.General;
  const showRatings = parentVisibility.showRatings !== false;
  const topMetrics = pace?.metrics
    ? Object.entries(pace.metrics)
        .filter(([, m]) => m != null && m.velocityPct != null)
        // Respect privacy: hide accuracy stats if ratings are hidden
        .filter(([key]) => showRatings || (key !== 'shooting' && key !== 'passing'))
        .sort(([a], [b]) => (weights[b] || 0) - (weights[a] || 0))
        .slice(0, 4)
        .map(([key, m]) => ({
          name: METRIC_NAMES[key],
          thisWeek: formatMetricValue(key, m.thisWeek),
          lastWeek: formatMetricValue(key, m.lastWeek),
          direction: m.velocityPct > 2 ? '↑' : m.velocityPct < -2 ? '↓' : '→',
          velocityPct: m.velocityPct,
        }))
    : [];

  // Active IDP goals (respect parentVisibility.showIdpGoals)
  const showIdp = parentVisibility.showIdpGoals !== false;
  const activeGoals = showIdp
    ? idpGoals.filter(g => g.status === 'active').map(g => ({ corner: g.corner, text: g.text }))
    : [];

  // Pace headline
  const paceLabel = pace?.overall?.label || 'steady';
  const paceVelocity = pace?.overall?.velocityPct;
  const headlinePrefix = hasIdentity && identityConfig?.label
    ? `${identityConfig.label}'s Pace`
    : 'Pace';

  // Plain-English why sentence
  const whySentence = generatePlainEnglishSummary(pace);

  // Training score
  // We don't import computeTrainingScoreWithDeltas here to avoid pulling in
  // the entire stats module just for one number. The caller can pass it in
  // or we compute a simple version.
  const trainingScore = pace?.overall?.velocityPct != null ? pace : null;

  return {
    playerName: settings.playerName || 'Player',
    position: Array.isArray(settings.position) ? settings.position.join(', ') : (settings.position || 'General'),
    identityLabels,
    ageGroup: settings.ageGroup || null,
    skillLevel: settings.skillLevel || null,
    dateRange: {
      from: fourWeeksAgoStr,
      to: nowStr,
    },
    pace: {
      headlinePrefix,
      label: paceLabel,
      velocityPct: paceVelocity,
      hasPace: pace != null && paceVelocity != null,
    },
    whySentence,
    summary: {
      weekCounts,
      totalSessions: recentSessions.length,
      totalTime,
      streak,
    },
    topMetrics,
    activeGoals,
    generatedAt: now.toISOString(),
  };
}
