import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { getToken } from '../hooks/useApi';

const PRIORITY_STYLES = {
  high: { dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', label: 'text-red-600' },
  medium: { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'text-amber-600' },
  low: { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', label: 'text-green-600' },
};

const PACE_CONFIG = {
  accelerating: { color: 'text-green-600', icon: '↑', bg: 'bg-green-50' },
  steady: { color: 'text-gray-500', icon: '→', bg: 'bg-gray-50' },
  stalling: { color: 'text-red-500', icon: '↓', bg: 'bg-red-50' },
};

export function SquadPulseCard() {
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activePlayer, setActivePlayer] = useState(null);

  useEffect(() => {
    fetch('/api/coach/squad-pulse', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setPulse)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !pulse || pulse.players.length === 0) return null;

  const { insights, summary, players } = pulse;
  const topInsights = insights.slice(0, 3);
  const hasIssues = insights.filter(i => i.priority === 'high').length;

  return (
    <div className="space-y-2">
      {/* Collapsed card */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                hasIssues > 0 ? 'bg-red-100' : summary.acceleratingCount > summary.stallingCount ? 'bg-green-100' : 'bg-accent/10'
              }`}>
                <span className="text-lg">{hasIssues > 0 ? '⚡' : '📊'}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Squad Pulse</p>
                <p className="text-[10px] text-gray-400">
                  {summary.totalSessionsThisWeek} sessions this week
                  {summary.sessionTrend != null && (
                    <span className={summary.sessionTrend >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {' '}({summary.sessionTrend >= 0 ? '+' : ''}{summary.sessionTrend}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasIssues > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {hasIssues}
                </span>
              )}
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Mini insight preview when collapsed */}
          {!expanded && topInsights.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{topInsights[0].text}</p>
            </div>
          )}
        </Card>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-3">
          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-2">
            <MiniStat
              label="Accelerating"
              value={summary.acceleratingCount}
              color="text-green-600"
              icon="↑"
            />
            <MiniStat
              label="Stalling"
              value={summary.stallingCount}
              color="text-red-500"
              icon="↓"
            />
            <MiniStat
              label="Compliance"
              value={summary.avgComplianceThisWeek != null ? `${summary.avgComplianceThisWeek}%` : '-'}
              color={summary.avgComplianceThisWeek >= 70 ? 'text-green-600' : summary.avgComplianceThisWeek >= 40 ? 'text-amber-500' : 'text-red-500'}
            />
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <Card>
              <h4 className="text-xs font-bold text-gray-900 mb-3">Insights</h4>
              <div className="space-y-2.5">
                {insights.map((insight, i) => {
                  const style = PRIORITY_STYLES[insight.priority];
                  return (
                    <div key={i} className={`rounded-lg border px-3 py-2.5 ${style.bg}`}>
                      <div className="flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                        <p className="text-xs text-gray-700 leading-relaxed">{insight.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Player Grid */}
          <Card>
            <h4 className="text-xs font-bold text-gray-900 mb-3">Player Breakdown</h4>
            <div className="space-y-2">
              {players.map(p => (
                <PlayerRow
                  key={p.playerId}
                  player={p}
                  isActive={activePlayer === p.playerId}
                  onToggle={() => setActivePlayer(activePlayer === p.playerId ? null : p.playerId)}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color, icon }) {
  return (
    <Card>
      <div className="text-center py-1">
        <p className={`text-lg font-bold ${color}`}>
          {icon && <span className="text-sm mr-0.5">{icon}</span>}
          {value}
        </p>
        <p className="text-[10px] text-gray-400">{label}</p>
      </div>
    </Card>
  );
}

function PlayerRow({ player, isActive, onToggle }) {
  const pace = PACE_CONFIG[player.paceLabel] || PACE_CONFIG.steady;

  return (
    <div>
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
              {player.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">{player.name}</p>
              <p className="text-[10px] text-gray-400">
                {Array.isArray(player.position) ? player.position.join(', ') : (player.position || '')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pace.bg} ${pace.color}`}>
              {pace.icon} {player.paceLabel}
            </span>
            <span className="text-xs font-medium text-gray-600">{player.sessionsThisWeek}s</span>
            <svg className={`w-3.5 h-3.5 text-gray-300 transition-transform ${isActive ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded player detail */}
      {isActive && (
        <div className="ml-10 pb-3 pt-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <MetricPill
              label="Shot %"
              current={player.shotAccuracy}
              prev={player.shotAccuracyPrev}
              suffix="%"
            />
            <MetricPill
              label="Pass %"
              current={player.passAccuracy}
              prev={player.passAccuracyPrev}
              suffix="%"
            />
            <MetricPill
              label="Intensity"
              current={player.rpeThisWeek}
              prev={player.rpeLastWeek}
              suffix="/10"
            />
            <MetricPill
              label="Compliance"
              current={player.compliancePct}
              prev={player.compliancePctPrev}
              suffix="%"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>{player.sessionsThisWeek} sessions this week</span>
            <span>·</span>
            <span>{player.sessionsLastWeek} last week</span>
            {player.sessionsThisMonth > 0 && (
              <>
                <span>·</span>
                <span>{player.sessionsThisMonth} this month</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, current, prev, suffix = '' }) {
  const delta = (current != null && prev != null && prev > 0)
    ? Math.round(((current - prev) / prev) * 100)
    : null;

  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">{label}</p>
        {delta != null && (
          <span className={`text-[9px] font-semibold ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {delta > 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-900">
        {current != null ? `${current}${suffix}` : '-'}
      </p>
    </div>
  );
}
