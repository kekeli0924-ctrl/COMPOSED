import { useMemo } from 'react';
import { Card } from './ui/Card';

export function WelcomeBack({ sessions, playerName, onStartSession }) {
  const info = useMemo(() => {
    if (sessions.length === 0) return null;

    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
    const lastDate = new Date(sorted[0].date);
    const now = new Date();
    const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    if (daysSince < 3) return null;

    // Calculate what streak was before the break
    let prevStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      if ((prev - curr) / (1000 * 60 * 60 * 24) <= 1.5) prevStreak++;
      else break;
    }

    return { daysSince, prevStreak, lastDate: sorted[0].date };
  }, [sessions]);

  if (!info) return null;

  return (
    <Card>
      <div className="text-center py-2">
        <p className="text-2xl mb-2">👋</p>
        <p className="text-sm font-bold text-gray-900 font-heading">
          Welcome back{playerName ? `, ${playerName}` : ''}!
        </p>
        <p className="text-xs text-gray-500 mt-1">
          It's been <span className="font-semibold text-accent">{info.daysSince} days</span> since your last session.
          {info.prevStreak >= 3 && (
            <> Your streak was {info.prevStreak} days.</>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-2">The best ability is availability. Let's get back on track.</p>
        <button
          onClick={onStartSession}
          className="mt-3 px-6 py-2 rounded-xl text-sm font-semibold btn-warm btn-bounce transition-all"
        >
          Start a session
        </button>
      </div>
    </Card>
  );
}
