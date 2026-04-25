// No-login public digest viewer.
//
// Rendered when the URL path is /r/:slug. App.jsx routes here BEFORE the auth
// gate so unauthenticated viewers can read the snapshot. The viewer reads the
// JSON snapshot the coach generated — it never hits authenticated endpoints or
// the live block data.
//
// Privacy: the snapshot is already filtered server-side. This component does
// not pull any additional data. See server/routes/digests.js buildSnapshot().

import { useEffect, useState } from 'react';

// Fire-and-forget open event — runs once per mount.
function reportOpened(slug) {
  try {
    fetch(`/api/public/digest/${encodeURIComponent(slug)}/opened`, { method: 'POST' })
      .catch(() => { /* silent */ });
  } catch { /* silent */ }
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DeltaBadge({ value, suffix = '' }) {
  if (value == null) return <span className="text-gray-300">—</span>;
  if (value === 0) return <span className="text-gray-500">no change</span>;
  const up = value > 0;
  return (
    <span className={up ? 'text-green-600' : 'text-red-500'}>
      {up ? '+' : ''}{value}{suffix} {up ? '↑' : '↓'}
    </span>
  );
}

export function PublicDigest({ slug }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    reportOpened(slug);
    fetch(`/api/public/digest/${encodeURIComponent(slug)}`)
      .then(async res => {
        if (res.status === 410) return setState({ status: 'revoked' });
        if (res.status === 404) return setState({ status: 'notfound' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setState({ status: 'ok', data });
      })
      .catch(err => setState({ status: 'error', error: err.message }));
  }, [slug]);

  // ── Loading ──
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-sm text-gray-400">Loading report…</p>
      </div>
    );
  }

  // ── Revoked ──
  if (state.status === 'revoked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This report is no longer available</h1>
          <p className="text-sm text-gray-500">The coach has revoked this link. Ask them for a new one if you need an update.</p>
        </div>
      </div>
    );
  }

  // ── Not found / error ──
  if (state.status === 'notfound' || state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-3">📄</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Report not found</h1>
          <p className="text-sm text-gray-500">This link doesn't match any report. Double-check the URL and try again.</p>
        </div>
      </div>
    );
  }

  // ── Snapshot ──
  const { snapshot, title, weekLabel, createdAt } = state.data;
  const { block, summary, players, generatedByCoachName } = snapshot;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto py-8 px-5 space-y-6">
        {/* Header */}
        <header>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold">Block report</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{title}</h1>
          {weekLabel && <p className="text-sm text-accent font-semibold mt-0.5">{weekLabel}</p>}
          <p className="text-xs text-gray-500 mt-2">
            {block.startDate} → {block.endDate}
            {generatedByCoachName ? ` · from ${generatedByCoachName}` : ''}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Snapshot from {formatDateTime(snapshot.generatedAt || createdAt)}
          </p>
        </header>

        {/* Summary strip */}
        <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Players</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{summary.playerCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Sessions</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {summary.sessionsCompleted}/{summary.sessionsAssigned}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Compliance</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {summary.compliancePct != null ? `${summary.compliancePct}%` : '—'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-gray-100">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Baseline</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">
                {summary.baselineComplete}/{summary.playerCount}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Week 2</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">
                {summary.retest1Complete}/{summary.playerCount}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Week 4</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">
                {summary.retest2Complete}/{summary.playerCount}
              </p>
            </div>
          </div>
        </section>

        {/* Player lines */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 px-1">Players</h2>
          <div className="space-y-2">
            {players.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-sm text-gray-500 text-center">No players in this block.</p>
              </div>
            )}
            {players.map((p, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-900">{p.displayName}</p>
                <p className="text-[11px] text-gray-400">{p.position}</p>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{p.oneLiner}</p>
                {(p.deltaLspt != null || p.deltaLsst != null) && (
                  <div className="mt-2 pt-2 border-t border-gray-50 flex gap-4 text-xs text-gray-500">
                    {p.deltaLspt != null && (
                      <div>LSPT <DeltaBadge value={p.deltaLspt} /></div>
                    )}
                    {p.deltaLsst != null && (
                      <div>LSST <DeltaBadge value={p.deltaLsst} /></div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Snapshot note */}
        <p className="text-[10px] text-gray-400 text-center px-4">
          This is a snapshot, not a live dashboard. Numbers were frozen when the coach generated this report.
        </p>
      </div>
    </div>
  );
}
