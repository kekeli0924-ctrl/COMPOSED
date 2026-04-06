import { useState, useEffect } from 'react';
import { Card } from './ui/Card';

function formatTimestamp(seconds) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProgressTimeline() {
  const [analyses, setAnalyses] = useState([]);

  useEffect(() => {
    fetch('/api/video/list')
      .then(r => r.ok ? r.json() : [])
      .then(setAnalyses)
      .catch(() => {});
  }, []);

  if (analyses.length < 2) return null;

  return (
    <Card>
      <div className="space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Video Progress</p>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {analyses.map((item) => (
            <div
              key={item.videoId}
              className="shrink-0 w-28 bg-gray-50 rounded-lg p-2.5 text-center"
            >
              <div className="text-xl mb-1">📹</div>
              <p className="text-[10px] font-medium text-gray-700">{formatDate(item.completedAt)}</p>
              {item.totalKicks > 0 && (
                <p className="text-[10px] text-accent font-semibold mt-0.5">{item.totalKicks} kicks</p>
              )}
              {item.shotPct != null && (
                <p className="text-[10px] text-gray-500">{item.shotPct}% acc.</p>
              )}
              {item.clipTimestamp != null && (
                <p className="text-[10px] text-gray-300 mt-0.5">highlight {formatTimestamp(item.clipTimestamp)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
