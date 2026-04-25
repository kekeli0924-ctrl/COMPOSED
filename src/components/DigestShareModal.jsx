// Coach-side share sheet for a block digest.
//
// Opens from BlockDetail. Generates a new digest snapshot on demand, or shows
// the most-recently-generated one. Gives the coach three actions:
//   - Copy public link
//   - Copy short summary text (composed from the snapshot numbers)
//   - Revoke
//
// Deliberately simple. Not a full "manage all past digests" surface — just the
// thin layer needed for a coach to get a proof URL out the door. Past digests
// for this block are listed below in a compact row so the coach can also revoke
// something they shared earlier.

import { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { apiFetch } from '../hooks/useApi';

function buildSummaryText({ block, summary, players }) {
  // A short paragraph a coach can paste into SMS/WhatsApp.
  const head = `${block.name} — ${block.startDate} → ${block.endDate}`;
  const line1 = `${summary.sessionsCompleted}/${summary.sessionsAssigned} sessions completed${summary.compliancePct != null ? ` (${summary.compliancePct}%)` : ''}.`;
  const line2 = `Baseline: ${summary.baselineComplete}/${summary.playerCount} · Week 2: ${summary.retest1Complete}/${summary.playerCount} · Week 4: ${summary.retest2Complete}/${summary.playerCount}.`;
  const names = players.slice(0, 3).map(p => p.displayName.split(/\s+/)[0]).join(', ');
  const line3 = players.length > 0 ? `Players: ${names}${players.length > 3 ? ` +${players.length - 3} more` : ''}.` : '';
  return [head, line1, line2, line3].filter(Boolean).join('\n');
}

export function DigestShareModal({ blockId, open, onClose }) {
  const [digests, setDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [justCopied, setJustCopied] = useState(null); // 'link' | 'summary' | null
  const [snapshotCache, setSnapshotCache] = useState({}); // slug → snapshot for summary text
  const [error, setError] = useState(null);

  const loadDigests = useCallback(async () => {
    try {
      const data = await apiFetch(`/blocks/${blockId}/digests`);
      setDigests(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }, [blockId]);

  useEffect(() => { if (open && blockId) { setLoading(true); loadDigests(); } }, [open, blockId, loadDigests]);

  const publicUrl = useCallback((slug) => `${window.location.origin}/r/${slug}`, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const created = await apiFetch(`/blocks/${blockId}/digests`, {
        method: 'POST',
        body: { title: title.trim() || undefined, weekLabel: weekLabel.trim() || undefined },
      });
      setDigests(prev => [created, ...prev]);
      setTitle(''); setWeekLabel('');
      // Immediately copy link for the first generated digest — saves a tap.
      try { await navigator.clipboard.writeText(publicUrl(created.slug)); setJustCopied('link'); setTimeout(() => setJustCopied(null), 1500); } catch { /* clipboard may fail */ }
    } catch (err) { setError(err.message); }
    setGenerating(false);
  }

  async function copyLink(slug) {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      setJustCopied('link');
      setTimeout(() => setJustCopied(null), 1500);
    } catch { setError('Could not copy to clipboard'); }
  }

  async function copySummary(slug) {
    // Fetch the snapshot if we don't have it cached — the public endpoint is no-auth.
    let snap = snapshotCache[slug];
    if (!snap) {
      try {
        const res = await fetch(`/api/public/digest/${slug}`);
        if (!res.ok) throw new Error('Could not load digest');
        const data = await res.json();
        snap = data.snapshot;
        setSnapshotCache(prev => ({ ...prev, [slug]: snap }));
      } catch (err) { setError(err.message); return; }
    }
    try {
      await navigator.clipboard.writeText(buildSummaryText(snap));
      setJustCopied('summary');
      setTimeout(() => setJustCopied(null), 1500);
    } catch { setError('Could not copy to clipboard'); }
  }

  async function revoke(digestId) {
    if (!confirm('Revoke this link? Anyone who already has it will see a "no longer available" page.')) return;
    try {
      await apiFetch(`/blocks/${blockId}/digests/${digestId}`, { method: 'DELETE' });
      setDigests(prev => prev.map(d => d.id === digestId ? { ...d, revokedAt: new Date().toISOString() } : d));
    } catch (err) { setError(err.message); }
  }

  if (!open) return null;

  const activeDigests = digests.filter(d => !d.revokedAt);
  const revokedDigests = digests.filter(d => d.revokedAt);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 bg-black/40" onClick={onClose}>
      <div className="max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">Share block report</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Generates a snapshot you can share with a parent or other coach. No login needed to view.
            Snapshot is frozen at generation time — revoke the link when you're done.
          </p>

          {/* Generate form */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-600">Title (optional)</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Spring block — Week 2 check-in"
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Week label (optional)</label>
              <input
                type="text"
                value={weekLabel}
                onChange={e => setWeekLabel(e.target.value)}
                placeholder="e.g. Week 2"
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                maxLength={80}
              />
            </div>
            <Button onClick={generate} disabled={generating} className="w-full">
              {generating ? 'Generating…' : 'Generate share link'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>
          )}
          {justCopied && (
            <div className="bg-green-50 text-green-700 text-xs px-3 py-2 rounded-lg mb-3">
              {justCopied === 'link' ? 'Link copied.' : 'Summary text copied.'}
            </div>
          )}

          {loading ? (
            <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
          ) : (
            <>
              {activeDigests.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Active links</p>
                  {activeDigests.map(d => (
                    <div key={d.id} className="border border-gray-100 rounded-lg p-2.5 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {d.weekLabel ? `${d.weekLabel} · ` : ''}Generated {formatWhen(d.createdAt)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono truncate mt-1">{publicUrl(d.slug)}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="secondary" onClick={() => copyLink(d.slug)} className="flex-1 !text-xs !py-1.5">Copy link</Button>
                        <Button variant="secondary" onClick={() => copySummary(d.slug)} className="flex-1 !text-xs !py-1.5">Copy summary</Button>
                        <Button variant="secondary" onClick={() => window.open(publicUrl(d.slug), '_blank', 'noopener,noreferrer')} className="!text-xs !py-1.5">Open</Button>
                        <button
                          onClick={() => revoke(d.id)}
                          className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 font-medium"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {revokedDigests.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">Revoked</p>
                  {revokedDigests.map(d => (
                    <div key={d.id} className="text-[11px] text-gray-400 flex justify-between py-1">
                      <span className="truncate">{d.title}</span>
                      <span className="shrink-0 ml-2">revoked</span>
                    </div>
                  ))}
                </div>
              )}

              {digests.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No share links yet.</p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}Z`);
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
