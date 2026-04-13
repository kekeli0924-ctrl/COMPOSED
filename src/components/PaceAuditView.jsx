import { useMemo } from 'react';
import { Card } from './ui/Card';
import { computePace } from '../utils/pace';
import { getPaceLabel as getIdentityPaceLabel } from '../utils/identity';
import {
  POSITION_WEIGHTS, METRIC_NAMES, formatMetricValue,
  generatePlainEnglishSummary,
} from '../utils/paceReport';

const PACE_COLORS = {
  accelerating: '#16A34A',
  steady: '#D97706',
  stalling: '#DC2626',
};

// ── Session list for this period ─────────────────────────────────────────────

function getThisWeekSessions(sessions) {
  if (!sessions || sessions.length === 0) return [];
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoff = weekAgo.toISOString().split('T')[0];
  return sessions
    .filter(s => s.date > cutoff)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ── Component ────────────────────────────────────────────────────────────────

export function PaceAuditView({ sessions, position, playerIdentity, onBack, onViewSession }) {
  const pace = useMemo(() => computePace(sessions, 4, position), [sessions, position]);
  const thisWeekSessions = useMemo(() => getThisWeekSessions(sessions), [sessions]);
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.General;
  const positionLabel = position || 'General';

  // Sort metrics by weight (heaviest first) for the movement section
  const sortedMetrics = useMemo(() => {
    if (!pace?.metrics) return [];
    return Object.entries(pace.metrics)
      .filter(([, m]) => m != null)
      .sort(([keyA], [keyB]) => (weights[keyB] || 0) - (weights[keyA] || 0));
  }, [pace, weights]);

  // Weight bar visual: sorted by weight descending
  const sortedWeights = useMemo(() => {
    return Object.entries(weights)
      .sort(([, a], [, b]) => b - a)
      .map(([key, w]) => ({ key, weight: w, name: METRIC_NAMES[key] || key, pct: Math.round(w * 100) }));
  }, [weights]);

  const summary = useMemo(() => generatePlainEnglishSummary(pace, sessions), [pace, sessions]);
  const overallColor = pace ? (PACE_COLORS[pace.overall.label] || PACE_COLORS.steady) : '#9CA3AF';

  // ── First-week / no-data states ────────────────────────────────────────────

  if (!sessions || sessions.length === 0) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <BackButton onClick={onBack} />
        <Card>
          <div className="text-center py-10 space-y-3">
            <div className="w-20 h-20 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
              <span className="text-3xl text-gray-300">↑</span>
            </div>
            <p className="text-sm font-semibold text-gray-700">No sessions yet</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Log your first training session and your Pace story starts here.
            </p>
          </div>
        </Card>
        <PaceExplainer />
      </div>
    );
  }

  if (!pace) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <BackButton onClick={onBack} />
        <Card>
          <div className="text-center py-10 space-y-3">
            <div className="w-20 h-20 rounded-full bg-gray-100 mx-auto flex items-center justify-center">
              <span className="text-3xl text-gray-300">↑</span>
            </div>
            <p className="text-sm font-semibold text-gray-700">Building your baseline</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Your Pace will start showing trends once you've logged at least 5 sessions across 2 weeks.
              Right now we're recording your baseline — keep training.
            </p>
          </div>
        </Card>
        <PaceExplainer />
      </div>
    );
  }

  // ── Main audit view ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <BackButton onClick={onBack} />

      {/* ── 1. Plain-English summary ────────────────────────────────────── */}
      <Card>
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: overallColor + '18', border: `2px solid ${overallColor}40` }}
          >
            <span className="text-lg font-bold" style={{ color: overallColor }}>
              {pace.overall.label === 'accelerating' ? '↑' : pace.overall.label === 'stalling' ? '↓' : '→'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: overallColor }}>
                {pace.overall.velocityPct > 0 ? '+' : ''}{pace.overall.velocityPct}%
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {pace.overall.label}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          </div>
        </div>
      </Card>

      {/* ── 2. Sessions this period ─────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 mb-2">
          Sessions This Week ({thisWeekSessions.length})
        </p>
        {thisWeekSessions.length === 0 ? (
          <Card>
            <p className="text-xs text-gray-400 text-center py-3">
              No sessions logged this week yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {thisWeekSessions.map(s => (
              <SessionRow
                key={s.id}
                session={s}
                position={position}
                onTap={() => onViewSession?.(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Position weight breakdown ────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 mb-2">
          What Moves Your Pace
        </p>
        <Card>
          <p className="text-xs text-gray-500 mb-3">
            Because you're a <span className="font-semibold text-gray-700">{positionLabel}</span>, your Pace weights:
          </p>
          <div className="space-y-2">
            {sortedWeights.map(({ key, name, pct }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-600 w-28 shrink-0">{name}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-500 w-8 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 4. Metric-level movement ────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1 mb-2">
          Metric Movement
        </p>
        <div className="space-y-1.5">
          {sortedMetrics.map(([key, metric]) => {
            const color = PACE_COLORS[metric.label] || PACE_COLORS.steady;
            const weightPct = Math.round((weights[key] || 0) * 100);
            return (
              <Card key={key}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-gray-700">{METRIC_NAMES[key]}</p>
                      <span className="text-[9px] text-gray-400">({weightPct}%)</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {formatMetricValue(key, metric.lastWeek)} → {formatMetricValue(key, metric.thisWeek)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold" style={{ color }}>
                      {metric.velocityPct > 0 ? '+' : ''}{metric.velocityPct}%
                    </span>
                    <span className="text-base" style={{ color }}>
                      {metric.velocityPct > 2 ? '↑' : metric.velocityPct < -2 ? '↓' : '→'}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── 5. Explainer footer ─────────────────────────────────────────── */}
      <PaceExplainer />
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}

function SessionRow({ session, position, onTap }) {
  const s = session;
  const shotPct = s.shooting?.shotsTaken > 0
    ? Math.round((s.shooting.goals / s.shooting.shotsTaken) * 100)
    : null;
  const passPct = s.passing?.attempts > 0
    ? Math.round((s.passing.completed / s.passing.attempts) * 100)
    : null;
  const dateLabel = new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Show the most position-relevant stat prominently
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.General;
  const shootingWeight = weights.shooting || 0;
  const passingWeight = weights.passing || 0;

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-surface rounded-xl border border-gray-100 px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{dateLabel}</span>
          <span className="text-[10px] text-gray-400">{s.duration}m</span>
        </div>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">
          {(s.drills || []).slice(0, 2).join(', ')}{(s.drills || []).length > 2 ? ` +${s.drills.length - 2}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-2">
        {shotPct != null && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Shot</p>
            <p className="text-xs font-semibold text-gray-700">{shotPct}%</p>
          </div>
        )}
        {passPct != null && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Pass</p>
            <p className="text-xs font-semibold text-gray-700">{passPct}%</p>
          </div>
        )}
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function PaceExplainer() {
  return (
    <div className="px-2 pb-4">
      <p className="text-[10px] text-gray-300 leading-relaxed text-center">
        Pace measures how much your training is improving week over week,
        weighted by what matters most for your position. It's not a grade —
        it's a trend signal.
      </p>
    </div>
  );
}
