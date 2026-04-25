// Coach's per-block detail view.
//
// Shows: block metadata, a per-player status table (linked / benchmarks done / sessions done /
// pace direction), and a CSV export button. One surface, scannable at a glance.

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { apiFetch, getToken } from '../hooks/useApi';
import { DigestShareModal } from './DigestShareModal';

// Colored dot for baseline / retest status.
//   green  = benchmark recorded
//   amber  = due today or in-window but not recorded
//   gray   = upcoming (outside window)
function PhaseCell({ phase, today, block }) {
  const hasLspt = !!phase.lspt;
  const hasLsst = !!phase.lsst;
  const complete = hasLspt && hasLsst;
  // In-window means between baseline/retest's allowed dates. PHASE_WINDOWS is
  // duplicated here because the server-side full windows (from/to) aren't echoed
  // per-phase; we approximate: "today on or after due date".
  const inWindow = today >= phase.dueDate && today <= addDays(phase.dueDate, phase.dueDate === block.baselineDue ? 7 : 5);
  const tone = complete
    ? { bg: 'bg-green-500', ring: 'ring-green-100', label: '✓' }
    : inWindow
      ? { bg: 'bg-amber-400', ring: 'ring-amber-100', label: '!' }
      : { bg: 'bg-gray-300', ring: 'ring-gray-100', label: '–' };

  const detail = [
    hasLspt ? `LSPT ${phase.lspt.score.toFixed(0)}` : 'LSPT —',
    hasLsst ? `LSST ${phase.lsst.score.toFixed(0)}` : 'LSST —',
  ].join(' · ');

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 shrink-0">
      <span className={`w-2 h-2 rounded-full ring-2 ${tone.bg} ${tone.ring}`} aria-label={tone.label} />
      <span className="whitespace-nowrap">{detail}</span>
    </div>
  );
}

// Tiny util: add N days to a YYYY-MM-DD string, naive UTC — used only for local UI
// approximations, not for server-truth windows.
function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PACE_PILL = {
  accelerating: { bg: 'bg-green-50', text: 'text-green-600', label: 'ACCEL' },
  steady:       { bg: 'bg-amber-50', text: 'text-amber-600', label: 'STEADY' },
  stalling:     { bg: 'bg-red-50',   text: 'text-red-600',   label: 'STALL' },
};

export function BlockDetail({ blockId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    apiFetch(`/blocks/${blockId}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [blockId]);

  async function downloadCsv() {
    setExporting(true);
    try {
      const res = await fetch(`/api/blocks/${blockId}/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : `block-${blockId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
    setExporting(false);
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading block…</div>;
  if (error) return <div className="max-w-2xl mx-auto py-12"><Card><p className="text-sm text-red-500 text-center">{error}</p></Card></div>;
  if (!data) return null;

  const today = todayYmd();
  const dayLabels = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
  const trainingDaysLabel = (data.trainingDays || []).map(d => dayLabels[d]).join(' · ');

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-accent mb-1">&larr; Back</button>
          <h1 className="text-xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.startDate} → {data.endDate} · {trainingDaysLabel} · {data.players.length} player{data.players.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setShareOpen(true)}>
            Share report
          </Button>
          <Button variant="secondary" onClick={downloadCsv} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Due-date strip */}
      <Card>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Baseline</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{data.baselineDue}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Week 2 retest</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{data.retest1Due}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Week 4 retest</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{data.retest2Due}</p>
          </div>
        </div>
      </Card>

      {/* Per-player rows */}
      <div className="space-y-2">
        {data.players.map(p => {
          const pacePill = PACE_PILL[p.paceLabel] || null;
          const sessionsPct = p.expectedCount > 0
            ? Math.round((p.completedCount / p.expectedCount) * 100)
            : 0;
          return (
            <Card key={p.playerId}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full ring-2 shrink-0 ${
                    p.linked ? 'bg-green-500 ring-green-100' : 'bg-red-500 ring-red-100'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.playerName}</p>
                    <p className="text-[10px] text-gray-400 truncate">@{p.username} · {p.position}</p>
                  </div>
                </div>
                {pacePill && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${pacePill.bg} ${pacePill.text}`}>
                    {pacePill.label}
                  </span>
                )}
              </div>

              {/* Benchmark phases */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 uppercase w-14">Baseline</span>
                  <PhaseCell phase={p.phases.baseline} today={today} block={data} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 uppercase w-14">Week 2</span>
                  <PhaseCell phase={p.phases.retest_1} today={today} block={data} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 uppercase w-14">Week 4</span>
                  <PhaseCell phase={p.phases.retest_2} today={today} block={data} />
                </div>
              </div>

              {/* Session progress */}
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 uppercase mb-1">
                  <span>Sessions</span>
                  <span>{p.completedCount} / {p.expectedCount}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${sessionsPct}%` }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <DigestShareModal blockId={blockId} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
