import { useMemo } from 'react';
import { Card } from './ui/Card';
import { getShotPercentage, getPassPercentage } from '../utils/stats';

function MiniSparkline({ data, color = '#1E3A5F', height = 32, width = 100 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Endpoint dot */}
      {data.length > 0 && (() => {
        const lastX = width;
        const lastY = height - ((data[data.length-1] - min) / range) * (height - 4) - 2;
        return <circle cx={lastX} cy={lastY} r="2.5" fill={color} />;
      })()}
    </svg>
  );
}

function MiniBar({ data, color = '#1E3A5F', height = 32, width = 80 }) {
  if (!data || data.length < 1) return null;
  const max = Math.max(...data, 1);
  const barW = Math.min(8, (width / data.length) - 2);

  return (
    <svg width={width} height={height} className="shrink-0">
      {data.map((v, i) => {
        const barH = (v / max) * (height - 4);
        const x = (i / data.length) * width + 1;
        return <rect key={i} x={x} y={height - barH - 2} width={barW} height={barH} rx="1.5" fill={color} opacity={i === data.length - 1 ? 1 : 0.4} />;
      })}
    </svg>
  );
}

export function ProgressCharts({ sessions }) {
  const stats = useMemo(() => {
    if (sessions.length < 2) return null;

    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    const last10 = sorted.slice(-10);

    // Shot accuracy trend
    const shotData = last10
      .filter(s => s.shooting?.shotsTaken >= 3)
      .map(s => Math.round((s.shooting.goals / s.shooting.shotsTaken) * 100));

    // Pass completion trend
    const passData = last10
      .filter(s => s.passing?.attempts >= 3)
      .map(s => Math.round((s.passing.completed / s.passing.attempts) * 100));

    // Sessions per week (last 4 weeks)
    const weeklyData = [];
    const now = new Date();
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w * 7 + now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = sessions.filter(s => {
        const d = new Date(s.date);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeklyData.push(count);
    }

    // RPE trend
    const rpeData = last10
      .filter(s => s.fitness?.rpe)
      .map(s => Number(s.fitness.rpe));

    // Total hours
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    // Current values
    const lastShot = shotData.length > 0 ? shotData[shotData.length - 1] : null;
    const lastPass = passData.length > 0 ? passData[passData.length - 1] : null;
    const thisWeekSessions = weeklyData[weeklyData.length - 1];
    const lastRpe = rpeData.length > 0 ? rpeData[rpeData.length - 1] : null;

    return { shotData, passData, weeklyData, rpeData, totalHours, lastShot, lastPass, thisWeekSessions, lastRpe };
  }, [sessions]);

  if (!stats) return null;

  return (
    <Card>
      <div className="space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">My Progress</p>

        <div className="grid grid-cols-2 gap-3">
          {/* Shot Accuracy */}
          {stats.shotData.length >= 2 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.lastShot}%</p>
                <p className="text-[10px] text-gray-400">Shot accuracy</p>
              </div>
              <MiniSparkline data={stats.shotData} color="#16A34A" />
            </div>
          )}

          {/* Pass Completion */}
          {stats.passData.length >= 2 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">{stats.lastPass}%</p>
                <p className="text-[10px] text-gray-400">Pass completion</p>
              </div>
              <MiniSparkline data={stats.passData} color="#3B82F6" />
            </div>
          )}

          {/* Sessions/Week */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.thisWeekSessions}</p>
              <p className="text-[10px] text-gray-400">This week</p>
            </div>
            <MiniBar data={stats.weeklyData} color="#C4956A" />
          </div>

          {/* RPE Load */}
          {stats.rpeData.length >= 2 && (
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-lg font-bold ${stats.lastRpe >= 8 ? 'text-red-500' : 'text-gray-900'}`}>{stats.lastRpe}/10</p>
                <p className="text-[10px] text-gray-400">Last RPE</p>
              </div>
              <MiniSparkline data={stats.rpeData} color={stats.lastRpe >= 8 ? '#EF4444' : '#8B7355'} />
            </div>
          )}
        </div>

        {/* Total hours */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <span className="text-[10px] text-gray-400">{stats.totalHours} total hours trained</span>
          <span className="text-[10px] text-gray-400">{sessions.length} sessions</span>
        </div>
      </div>
    </Card>
  );
}
