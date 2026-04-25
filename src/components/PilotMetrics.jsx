// Founder-only pilot metrics page.
//
// One screen, one purpose: show the 14-event catalog with all-time and 7-day
// counts, plus the last 50 events as a raw feed. A "Download CSV" button
// downloads the full events table so we can analyze offline if needed.
//
// Access is enforced server-side by `requireFounder` — this component just shows
// a clean error if the backend refuses.

import { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { apiFetch, getToken } from '../hooks/useApi';

// Human-readable labels — keeps the raw event names in the CSV/JSON but gives the
// founder a less cryptic dashboard.
const EVENT_LABELS = {
  invite_code_created: 'Coach created invite code',
  onboarding_completed: 'Player completed onboarding',
  coach_player_linked: 'Player joined a coach',
  session_logged: 'Session logged',
  assigned_plan_created: 'Coach assigned a plan',
  assigned_plan_completed: 'Player completed assigned plan',
  video_analysis_started: 'Video analysis started',
  video_analysis_completed: 'Video analysis finished',
  invite_link_opened: 'Invite link opened',
  video_analysis_fallback_to_manual: 'Video → manual fallback',
  pace_audit_opened: 'Pace audit opened',
  coach_report_generated: 'Coach report generated',
  weekly_digest_generated: 'Weekly digest generated',
  weekly_digest_opened: 'Weekly digest opened',
};

// Groups for readability — same categories used in the emit catalog.
const GROUPS = [
  {
    name: 'Activation',
    events: ['invite_code_created', 'invite_link_opened', 'coach_player_linked', 'onboarding_completed'],
  },
  {
    name: 'Training loop',
    events: ['session_logged', 'assigned_plan_created', 'assigned_plan_completed'],
  },
  {
    name: 'Video pipeline',
    events: ['video_analysis_started', 'video_analysis_completed', 'video_analysis_fallback_to_manual'],
  },
  {
    name: 'Insight surfaces',
    events: ['pace_audit_opened', 'coach_report_generated', 'weekly_digest_generated', 'weekly_digest_opened'],
  },
];

function formatTime(iso) {
  if (!iso) return '';
  // occurred_at is a naive UTC string from SQLite ("YYYY-MM-DD HH:MM:SS"). Add Z so
  // toLocaleString interprets it correctly in the user's local TZ.
  const d = new Date(iso.includes('T') ? iso : `${iso}Z`);
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function PilotMetrics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState('');

  // Initial load without block scope
  useEffect(() => {
    apiFetch('/events/metrics')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch when block selection changes (keeps existing catalog + pilotTruth)
  useEffect(() => {
    if (!selectedBlockId) return;
    const q = `?blockId=${encodeURIComponent(selectedBlockId)}`;
    apiFetch(`/events/metrics${q}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [selectedBlockId]);

  function downloadCsv() {
    // Direct anchor download — apiFetch returns JSON, but the CSV endpoint sends
    // text/csv. Easier to just hit it with a fetch and click a synthesized <a>.
    const q = selectedBlockId ? `?blockId=${encodeURIComponent(selectedBlockId)}` : '';
    fetch(`/api/events/export${q}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`Export failed: ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const suffix = selectedBlockId ? `block-${selectedBlockId.slice(0,8)}` : 'all';
        a.download = `pilot-events-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(err => alert(`Export failed: ${err.message}`));
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading metrics…</div>;
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <p className="text-sm text-red-500 text-center">{error}</p>
          <p className="text-xs text-gray-400 text-center mt-2">
            Access restricted to the founder account. Set FOUNDER_USERNAME in the server env.
          </p>
        </Card>
      </div>
    );
  }

  const { totalEvents, uniqueUsers, byEvent, lastEvents, blocks = [], pilotTruth } = data;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pilot metrics</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalEvents.toLocaleString()} events · {uniqueUsers} unique user{uniqueUsers !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="secondary" onClick={downloadCsv}>Download CSV</Button>
      </div>

      {/* Block selector */}
      {blocks.length > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <label className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 shrink-0">Block</label>
            <select
              value={selectedBlockId}
              onChange={e => setSelectedBlockId(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">All events (no block filter)</option>
              {blocks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.startDate} · @{b.coachUsername}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Pilot truth — only when a block is selected */}
      {pilotTruth && !pilotTruth.error && (
        <Card>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-3">
            Pilot truth — {pilotTruth.block.name}
          </p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
            <PilotStat label="Invited" value={pilotTruth.activation.invited} />
            <PilotStat label="Linked" value={pilotTruth.activation.linked} />
            <PilotStat label="Onboarded" value={pilotTruth.activation.onboarded} />
            <PilotStat label="First session done" value={pilotTruth.activation.firstSessionCompleted} />
            <PilotStat label="Sessions assigned" value={pilotTruth.training.sessionsAssigned} />
            <PilotStat label="Sessions completed" value={pilotTruth.training.sessionsCompleted} />
            <PilotStat label="Compliance" value={pilotTruth.training.compliancePct != null ? `${pilotTruth.training.compliancePct}%` : '—'} />
            <PilotStat label="Manual sessions" value={pilotTruth.video.manualSessions} />
            <PilotStat label="Video sessions" value={pilotTruth.video.videoSessions} />
            <PilotStat label="Video → manual fallback" value={pilotTruth.video.videoFallbackCount} />
            <PilotStat label={`Baseline (${pilotTruth.benchmarks.memberCount})`} value={pilotTruth.benchmarks.baselineComplete} />
            <PilotStat label={`Week 2 retest (${pilotTruth.benchmarks.memberCount})`} value={pilotTruth.benchmarks.retest1Complete} />
            <PilotStat label={`Week 4 retest (${pilotTruth.benchmarks.memberCount})`} value={pilotTruth.benchmarks.retest2Complete} />
            <PilotStat label="Digests generated" value={pilotTruth.digests.generated} />
            <PilotStat label="Digest opens" value={pilotTruth.digests.opened} />
          </div>
        </Card>
      )}
      {pilotTruth?.error && (
        <Card><p className="text-xs text-red-500">{pilotTruth.error}</p></Card>
      )}

      {/* Grouped catalog */}
      {GROUPS.map(group => (
        <Card key={group.name}>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-2">{group.name}</p>
          <div className="divide-y divide-gray-100">
            {group.events.map(name => {
              const stats = byEvent[name] || { total: 0, last7d: 0 };
              const dim = stats.total === 0;
              return (
                <div key={name} className={`flex items-center justify-between py-2 ${dim ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="text-sm text-gray-800">{EVENT_LABELS[name] || name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{stats.last7d}</p>
                      <p className="text-[9px] text-gray-400 uppercase">7d</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stats.total}</p>
                      <p className="text-[9px] text-gray-400 uppercase">all</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Raw feed — last 50 */}
      <Card>
        <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-2">
          Last {lastEvents.length} events
        </p>
        {lastEvents.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No events yet.</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {lastEvents.map((e, i) => (
              <div key={i} className="text-[11px] text-gray-700 border-b border-gray-50 py-1.5 flex items-start gap-2">
                <span className="text-gray-400 shrink-0 w-24">{formatTime(e.occurredAt)}</span>
                <span className="font-mono text-gray-800 shrink-0">{e.event}</span>
                <span className="text-gray-400 truncate">
                  {e.username ? `@${e.username}` : e.userId ? `user ${e.userId}` : 'anon'}
                  {e.properties && Object.keys(e.properties).length > 0 ? ` · ${JSON.stringify(e.properties)}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PilotStat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
