import { useState } from 'react';
import { Card, StatCard } from './ui/Card';
import { Button } from './ui/Button';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

function DeadlineBadge({ targetDate }) {
  if (!targetDate) return null;
  const days = Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Overdue</span>;
  if (days <= 7) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">{days}d left</span>;
  if (days <= 30) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{days}d left</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{days}d left</span>;
}

function MiniSparkline({ data, color = '#1E3A5F' }) {
  if (!data || data.every(d => d == null)) return <span className="text-xs text-gray-300">No data</span>;
  const chartData = data.map((v, i) => ({ v: v ?? 0, i }));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 w-6 text-right">{data[0] ?? '-'}</span>
      <ResponsiveContainer width="100%" height={30}>
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <span className="text-[10px] font-semibold text-gray-700 w-6">{data[data.length - 1] ?? '-'}</span>
    </div>
  );
}

export function ParentDashboard({ dashboardData, children, selectedChild, onSelectChild, onConnectCode }) {
  const [connectCode, setConnectCode] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!connectCode.trim()) return;
    setConnecting(true);
    setConnectError('');
    try {
      const res = await fetch('/api/parent/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: connectCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setConnectCode('');
        onConnectCode?.();
      } else {
        setConnectError(data.error || 'Invalid code');
      }
    } catch {
      setConnectError('Connection failed');
    }
    setConnecting(false);
  };

  // Empty state — no child connected
  if (!children || children.length === 0) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <h1 className="text-2xl text-accent tracking-tight text-center font-logo">Composed</h1>

        <Card>
          <div className="text-center space-y-4 py-4">
            <div className="text-4xl">🔗</div>
            <h2 className="text-lg font-bold text-gray-900">Connect to your child's account</h2>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Ask your child to generate a parent invite code from their settings. Enter it below to see their training progress.
            </p>

            <div className="flex gap-2 max-w-xs mx-auto">
              <input
                type="text"
                value={connectCode}
                onChange={e => setConnectCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                maxLength={6}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <Button onClick={handleConnect} disabled={connectCode.length < 4 || connecting}>
                {connecting ? '...' : 'Connect'}
              </Button>
            </div>
            {connectError && <p className="text-xs text-red-500">{connectError}</p>}

            <div className="space-y-2 pt-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">How it works</p>
              {[
                { num: '1', text: 'Your child opens Settings → Parent Access' },
                { num: '2', text: "They tap 'Generate Parent Code'" },
                { num: '3', text: 'You enter the code above' },
              ].map(s => (
                <div key={s.num} className="flex items-center gap-2 justify-center">
                  <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">{s.num}</span>
                  <p className="text-xs text-gray-600">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const d = dashboardData;
  if (!d) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <h1 className="text-2xl text-accent tracking-tight text-center font-logo">Composed</h1>
        <div className="text-center py-12 text-gray-300 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h1 className="text-2xl text-accent tracking-tight text-center font-logo">Composed</h1>

      {/* Child selector tabs */}
      {children.length > 1 && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mx-auto">
          {children.map(child => (
            <button
              key={child.playerId}
              onClick={() => onSelectChild(child.playerId)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedChild === child.playerId ? 'bg-white text-accent shadow-sm' : 'text-gray-500'
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      {/* Section 1: Player Card */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-bold text-accent shrink-0">
            {d.player.name?.[0]?.toUpperCase() || '⚽'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{d.player.name}</h2>
            <p className="text-xs text-gray-400">
              {Array.isArray(d.player.position) && d.player.position.length > 0
                ? `${d.player.position.join(', ')} · `
                : ''}
              {d.player.ageGroup ? `${d.player.ageGroup} · ` : ''}{d.player.skillLevel || ''}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-semibold text-accent">Level {d.xp?.level || 1}</span>
              <span className="text-[10px] text-gray-400">{d.xp?.total || 0} XP</span>
              {d.streak?.current > 0 && (
                <span className="text-xs font-semibold text-amber-600">🔥 {d.streak.current}-day streak</span>
              )}
            </div>
          </div>
        </div>
        {/* XP progress bar */}
        {d.xp?.levelProgress && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Level {d.xp.level}</span>
              <span>{d.xp.levelProgress.current}/{d.xp.levelProgress.needed} XP</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${d.xp.levelProgress.pct}%` }} />
            </div>
          </div>
        )}
      </Card>

      {/* Section 2: This Week's Activity */}
      <Card>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">This Week</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{d.thisWeek?.sessionsCompleted || 0}</p>
            <p className="text-[10px] text-gray-400">of {d.thisWeek?.weeklyGoal || 3} sessions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-700">{d.thisWeek?.totalDuration || 0}</p>
            <p className="text-[10px] text-gray-400">minutes</p>
          </div>
          {d.thisWeek?.avgRating != null && (
            <div className="text-center">
              <p className="text-2xl font-bold text-warm">{d.thisWeek.avgRating}</p>
              <p className="text-[10px] text-gray-400">avg rating</p>
            </div>
          )}
        </div>

        {/* Weekly goal progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className="bg-accent h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, ((d.thisWeek?.sessionsCompleted || 0) / (d.thisWeek?.weeklyGoal || 3)) * 100)}%` }}
          />
        </div>

        {/* Session list */}
        {d.thisWeek?.sessionSummaries?.length > 0 && (
          <div className="space-y-2">
            {d.thisWeek.sessionSummaries.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-gray-700">{new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <p className="text-[10px] text-gray-400">{s.drills?.slice(0, 2).join(', ')}{s.drills?.length > 2 ? ` +${s.drills.length - 2}` : ''}</p>
                </div>
                <div className="flex gap-3 text-right">
                  {s.shotAccuracy != null && (
                    <div><p className="text-[10px] text-gray-400">Shot</p><p className="text-xs font-semibold text-accent">{s.shotAccuracy}%</p></div>
                  )}
                  {s.passAccuracy != null && (
                    <div><p className="text-[10px] text-gray-400">Pass</p><p className="text-xs font-semibold text-accent">{s.passAccuracy}%</p></div>
                  )}
                  <div><p className="text-[10px] text-gray-400">Time</p><p className="text-xs font-semibold text-gray-600">{s.duration}m</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
        {(!d.thisWeek?.sessionSummaries || d.thisWeek.sessionSummaries.length === 0) && (
          <p className="text-xs text-gray-300 text-center py-2">No sessions this week yet</p>
        )}
      </Card>

      {/* Section 3: Training Focus / Active Program */}
      {d.activeProgram && (
        <Card>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Active Program</p>
          <p className="text-sm font-semibold text-gray-900">{d.activeProgram.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Week {d.activeProgram.week}, Day {d.activeProgram.day} — {d.activeProgram.completedSessions} of {d.activeProgram.totalSessions} sessions
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-accent h-1.5 rounded-full transition-all"
              style={{ width: `${(d.activeProgram.completedSessions / d.activeProgram.totalSessions) * 100}%` }}
            />
          </div>
        </Card>
      )}

      {/* Section 4: Development Goals (IDP) — read-only */}
      {d.idpProgress && (
        <Card>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Development Goals</p>
          <div className="space-y-3">
            {[
              { id: 'technical', label: 'Technical', emoji: '⚙️' },
              { id: 'tactical', label: 'Tactical', emoji: '🧠' },
              { id: 'physical', label: 'Physical', emoji: '💪' },
              { id: 'psychological', label: 'Psychological', emoji: '🏐' },
            ].map(corner => {
              const goals = d.idpProgress[corner.id]?.goals || [];
              return (
                <div key={corner.id}>
                  <p className="text-xs font-semibold text-gray-700 mb-1">{corner.emoji} {corner.label}</p>
                  {goals.length === 0 ? (
                    <p className="text-[10px] text-gray-300 ml-5">No goals set</p>
                  ) : (
                    <div className="space-y-1.5 ml-5">
                      {goals.map((g, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 truncate">{g.text}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 bg-gray-100 rounded-full h-1">
                                <div className="bg-accent h-1 rounded-full" style={{ width: `${g.progress}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0">{g.progress}%</span>
                              <DeadlineBadge targetDate={g.targetDate} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Section 5: Coach Connection */}
      {d.coachFeedback && (
        <Card>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Coach</p>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">{d.coachFeedback.coachName}</p>
            <span className="text-xs text-accent font-medium">{d.coachFeedback.complianceRate}% compliance</span>
          </div>
          {d.coachFeedback.recentPlans?.length > 0 && (
            <div className="space-y-1.5">
              {d.coachFeedback.recentPlans.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs text-gray-700">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <p className="text-[10px] text-gray-400">{p.drills?.slice(0, 2).join(', ')}</p>
                  </div>
                  <span className="text-xs">{p.completed ? '✅' : '⏳'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      {d.coachFeedback === null && d.idpProgress !== undefined && (
        <Card>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Coach</p>
          <p className="text-xs text-gray-300 text-center py-2">No coach connected yet</p>
        </Card>
      )}

      {/* Section 6: Trends */}
      {d.trends && (
        <Card>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">5-Week Trends</p>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Sessions per week</p>
              <MiniSparkline data={d.trends.sessionsPerWeek} color="#1E3A5F" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Shot accuracy %</p>
              <MiniSparkline data={d.trends.shotAccuracy} color="#C4956A" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Pass accuracy %</p>
              <MiniSparkline data={d.trends.passAccuracy} color="#2A4A73" />
            </div>
          </div>
        </Card>
      )}

      {/* Section 7: Recent Achievements */}
      <Card>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Achievements</p>
        {d.recentBadges?.length > 0 ? (
          <div className="space-y-2">
            {d.recentBadges.map((badge, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{badge.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-gray-700">{badge.name}</p>
                  <p className="text-[10px] text-gray-400">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-300 text-center py-2">Badges will appear here as your child trains</p>
        )}
      </Card>
    </div>
  );
}
