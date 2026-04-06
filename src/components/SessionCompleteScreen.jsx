import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { formatPercentage } from '../utils/stats';
import { renderWeeklySummaryCard, shareCanvas } from '../utils/shareCard';

function DeltaArrow({ current, previous, suffix = '' }) {
  if (previous == null || current == null) return null;
  const delta = current - previous;
  if (delta === 0) return <span className="text-gray-400">&mdash;</span>;
  const isUp = delta > 0;
  return (
    <span className={isUp ? 'text-green-600' : 'text-red-500'}>
      {isUp ? '+' : ''}{delta}{suffix} {isUp ? '↑' : '↓'}
    </span>
  );
}

function AnimatedCounter({ target, duration = 800 }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return <span>{value}</span>;
}

export function SessionCompleteScreen({ session, completionData, onDone }) {
  const [phase, setPhase] = useState(1);
  const timerRef = useRef(null);

  const cd = completionData || {};
  const shooting = session?.shooting;
  const passing = session?.passing;
  const prevSession = cd.previousSession;

  // Fire confetti on mount
  useEffect(() => {
    const shouldConfetti = (cd.streak?.current >= 3) || (cd.badgesUnlocked?.length > 0);
    const isMilestone = cd.streak?.isNewMilestone;

    if (shouldConfetti) {
      const colors = ['#1E3A5F', '#C4956A', '#F5F0EB', '#FFFFFF'];
      const burst = isMilestone ? 3 : 1;
      for (let i = 0; i < burst; i++) {
        setTimeout(() => {
          confetti({
            particleCount: isMilestone ? 80 : 40,
            spread: isMilestone ? 100 : 60,
            origin: { y: 0.3 },
            colors,
            disableForReducedMotion: true,
          });
        }, i * 400);
      }
    }
  }, []);

  // Auto-advance phases
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (phase < 4) setPhase(p => p + 1);
    }, phase === 1 ? 1500 : 1200);
    return () => clearTimeout(timerRef.current);
  }, [phase]);

  const advance = useCallback(() => {
    clearTimeout(timerRef.current);
    if (phase < 4) setPhase(p => p + 1);
  }, [phase]);

  if (!session) return null;

  const shotPct = shooting?.shotsTaken > 0 ? Math.round((shooting.goals / shooting.shotsTaken) * 100) : null;
  const passPct = passing?.attempts > 0 ? Math.round((passing.completed / passing.attempts) * 100) : null;

  return (
    <div className="max-w-lg mx-auto py-6 px-4 min-h-screen" onClick={phase < 4 ? advance : undefined}>

      {/* Phase 1: Splash */}
      <div className="text-center mb-6" style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
        <div className="text-5xl mb-3">
          {cd.streak?.isNewMilestone ? '🔥' : '✅'}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 font-heading">
          Session Complete!
        </h1>
        <p className="text-xl text-accent font-semibold mt-2">{session.duration} minutes</p>
        {cd.streak?.isNewMilestone && (
          <p className="text-lg font-bold text-amber-600 mt-1" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.3s both' }}>
            🔥 {cd.streak.milestone}-Day Streak!
          </p>
        )}
        {cd.streak?.current > 0 && !cd.streak?.isNewMilestone && (
          <p className="text-sm text-gray-500 mt-1">🔥 {cd.streak.current}-day streak</p>
        )}
      </div>

      {/* Phase 2: Stats Card */}
      {phase >= 2 && (
        <div style={{ animation: 'slideUp 0.4s ease-out' }}>
          <Card className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Today's Session</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-accent">{session.duration}</p>
                <p className="text-[10px] text-gray-400">min</p>
              </div>
              {shotPct != null && (
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{shotPct}%</p>
                  <p className="text-[10px] text-gray-400">shots</p>
                </div>
              )}
              {passPct != null && (
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{passPct}%</p>
                  <p className="text-[10px] text-gray-400">passes</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-lg font-bold text-gray-700">{(session.drills || []).length}</p>
                <p className="text-[10px] text-gray-400">drills</p>
              </div>
              {session.quickRating && (
                <div className="text-center">
                  <p className="text-lg font-bold text-warm">{session.quickRating}/5</p>
                  <p className="text-[10px] text-gray-400">rating</p>
                </div>
              )}
            </div>

            {/* vs Last Session */}
            {prevSession ? (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-2">vs. Last Session</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <DeltaArrow current={session.duration} previous={prevSession.duration} suffix=" min" />
                  </div>
                  {shotPct != null && prevSession.shotAccuracy != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shot %</span>
                      <DeltaArrow current={shotPct} previous={prevSession.shotAccuracy} suffix="%" />
                    </div>
                  )}
                  {passPct != null && prevSession.passAccuracy != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pass %</span>
                      <DeltaArrow current={passPct} previous={prevSession.passAccuracy} suffix="%" />
                    </div>
                  )}
                </div>
              </div>
            ) : cd.isFirstSession ? (
              <div className="border-t border-gray-100 pt-3 text-center">
                <p className="text-sm text-gray-600">First session logged! 🎉</p>
                <p className="text-xs text-gray-400 mt-0.5">Keep going to track your progress.</p>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {/* Phase 3: Rewards */}
      {phase >= 3 && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {/* XP Breakdown */}
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">XP Earned</p>
              <p className="text-lg font-bold text-accent">+<AnimatedCounter target={cd.totalXP || 25} /></p>
            </div>

            {cd.xpBreakdown && (
              <div className="space-y-1 text-xs text-gray-500 mb-3">
                {cd.xpBreakdown.sessionLogged > 0 && <div className="flex justify-between"><span>Session logged</span><span>+{cd.xpBreakdown.sessionLogged}</span></div>}
                {cd.xpBreakdown.dailyPlan > 0 && <div className="flex justify-between"><span>Daily plan completed</span><span>+{cd.xpBreakdown.dailyPlan}</span></div>}
                {cd.xpBreakdown.streakBonus > 0 && <div className="flex justify-between"><span>Streak bonus</span><span>+{cd.xpBreakdown.streakBonus}</span></div>}
                {cd.xpBreakdown.durationBonus > 0 && <div className="flex justify-between"><span>60+ min bonus</span><span>+{cd.xpBreakdown.durationBonus}</span></div>}
                {cd.xpBreakdown.personalRecord > 0 && <div className="flex justify-between"><span>New record!</span><span>+{cd.xpBreakdown.personalRecord}</span></div>}
              </div>
            )}

            {/* Level Progress */}
            {cd.levelProgress && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Level {cd.levelProgress.level || 1}</span>
                  <span>{cd.levelProgress.current}/{cd.levelProgress.needed} XP</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full"
                    style={{ width: `${cd.levelProgress.pct || 0}%`, transition: 'width 0.6s ease-out' }}
                  />
                </div>
                {cd.newLevel && (
                  <p className="text-center text-sm font-bold text-accent mt-2" style={{ animation: 'scaleUp 0.4s ease-out' }}>
                    🎉 Level {cd.newLevel}!
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Badges */}
          {cd.badgesUnlocked?.length > 0 && (
            <Card className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Badge Unlocked</p>
              <div className="space-y-3">
                {cd.badgesUnlocked.map((badge, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ animation: `scaleUp 0.4s ease-out ${i * 0.5}s both` }}>
                    <span className="text-3xl">{badge.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{badge.name}</p>
                      <p className="text-xs text-gray-500">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Personal Records */}
          {cd.personalRecords?.length > 0 && (
            <Card className="mb-4 border-amber-200 bg-amber-50/30">
              <div className="space-y-2">
                {cd.personalRecords.map((pr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xl">🏆</span>
                    <div>
                      <p className="text-xs font-bold text-amber-800">NEW PERSONAL RECORD</p>
                      <p className="text-xs text-gray-700">{pr.metric}: {pr.newValue}</p>
                      {pr.previousValue && <p className="text-[10px] text-gray-400">Previous: {pr.previousValue}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Phase 4: Tomorrow + Actions */}
      {phase >= 4 && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {/* Tomorrow's Plan */}
          {cd.tomorrowPlan?.exists ? (
            <Card className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Tomorrow's Plan</p>
              <p className="text-xs text-gray-700">
                {cd.tomorrowPlan.drills?.slice(0, 3).join(' · ')}
                {cd.tomorrowPlan.drills?.length > 3 ? ' ...' : ''}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {cd.tomorrowPlan.duration} min · {cd.tomorrowPlan.drills?.length} drills
              </p>
              <p className="text-xs text-gray-500 italic mt-2">Keep the momentum going</p>
            </Card>
          ) : (
            <Card className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Tomorrow</p>
              <p className="text-xs text-gray-500">No plan for tomorrow yet</p>
            </Card>
          )}

          {/* Weekly Goal */}
          {cd.weeklyGoal && (
            <div className="text-center mb-4">
              {cd.weeklyGoal.met ? (
                <p className="text-sm font-semibold text-green-600">🎯 Weekly goal reached! {cd.weeklyGoal.completed}/{cd.weeklyGoal.target} sessions</p>
              ) : (
                <p className="text-xs text-gray-500">
                  {cd.weeklyGoal.target - cd.weeklyGoal.completed} session{cd.weeklyGoal.target - cd.weeklyGoal.completed !== 1 ? 's' : ''} from your weekly goal
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => {
              const canvas = renderWeeklySummaryCard({
                totalSessions: 1,
                totalTime: session?.duration || 0,
                avgShotPct: shotPct,
                avgPassPct: passPct,
              });
              shareCanvas(canvas);
            }} className="flex-1 py-3">
              Share Session
            </Button>
            <Button onClick={onDone} className="flex-1 py-3">
              Done ✓
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
