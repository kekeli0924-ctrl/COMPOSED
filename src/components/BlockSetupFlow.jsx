// Guided 4-week block setup for coaches.
//
// Four steps in one screen, top to bottom:
//   1. Name + start date
//   2. Pick 2 training days
//   3. Pick players (or generate invite code if roster is empty)
//   4. Confirm + Create
//
// Deliberately one screen instead of a multi-step wizard — the coach can see
// everything they're about to commit to before clicking Create. Keeps the flow
// short for a pilot where the coach is often sitting next to the product team.

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { apiFetch, getToken } from '../hooks/useApi';

const DAYS = [
  { idx: 1, short: 'Mon' },
  { idx: 2, short: 'Tue' },
  { idx: 3, short: 'Wed' },
  { idx: 4, short: 'Thu' },
  { idx: 5, short: 'Fri' },
  { idx: 6, short: 'Sat' },
  { idx: 0, short: 'Sun' },
];

// Today (local) as YYYY-MM-DD — defaults the start date picker to today so the
// coach doesn't have to pick a date to get started.
function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BlockSetupFlow({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayYmd());
  const [trainingDays, setTrainingDays] = useState([1, 4]); // Mon + Thu
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [inviteCode, setInviteCode] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load roster on mount — this is the coach's existing player list.
  useEffect(() => {
    apiFetch('/roster')
      .then(data => {
        setRoster(Array.isArray(data) ? data : []);
        // Default-select everyone. Coach can unselect, but for a pilot the
        // expected path is "use my whole roster."
        setSelectedPlayers(new Set((data || []).map(p => p.playerId)));
      })
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, []);

  function toggleDay(idx) {
    setTrainingDays(prev => {
      if (prev.includes(idx)) {
        // Deselect — but we need exactly 2, so don't go below 1.
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== idx);
      }
      // Selecting a third one replaces the oldest so we stay at 2.
      if (prev.length >= 2) return [prev[1], idx];
      return [...prev, idx];
    });
  }

  function togglePlayer(playerId) {
    setSelectedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function generateInvite() {
    setGeneratingCode(true);
    try {
      const res = await fetch('/api/roster/invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.code);
      } else {
        setError('Could not generate invite code');
      }
    } catch {
      setError('Could not generate invite code');
    }
    setGeneratingCode(false);
  }

  async function createBlock() {
    if (selectedPlayers.size === 0) {
      setError('Pick at least one player, or generate an invite code and share it first.');
      return;
    }
    if (trainingDays.length !== 2) {
      setError('Pick exactly two training days.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const block = await apiFetch('/blocks', {
        method: 'POST',
        body: {
          name: name.trim() || undefined,
          startDate,
          trainingDays: [...trainingDays].sort((a, b) => a - b),
          memberIds: Array.from(selectedPlayers),
        },
      });
      onCreated?.(block);
    } catch (err) {
      setError(err.message || 'Block creation failed');
    }
    setSubmitting(false);
  }

  const rosterEmpty = !loadingRoster && roster.length === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Start 4-week block</h1>
        <p className="text-xs text-gray-500 mt-1">
          Two solo sessions per week · baseline, week 2, week 4 benchmarks
        </p>
      </div>

      {/* 1. Name + start date */}
      <Card>
        <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-3">Block details</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spring Technical Block"
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Baseline is due on start date · week 2 retest at day 14 · week 4 retest at day 28
            </p>
          </div>
        </div>
      </Card>

      {/* 2. Training days */}
      <Card>
        <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-3">Training days · pick two</p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map(d => {
            const selected = trainingDays.includes(d.idx);
            return (
              <button
                key={d.idx}
                type="button"
                onClick={() => toggleDay(d.idx)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-accent text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          Generates 8 assigned sessions (2 days × 4 weeks)
        </p>
      </Card>

      {/* 3. Players */}
      <Card>
        <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-3">
          Players · {selectedPlayers.size} selected
        </p>
        {loadingRoster ? (
          <p className="text-xs text-gray-400 text-center py-4">Loading roster…</p>
        ) : rosterEmpty ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-gray-700">Your roster is empty.</p>
            <p className="text-xs text-gray-500">
              Generate an invite code and share it with your players. They'll appear here after they join.
            </p>
            {inviteCode ? (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase">Invite code</p>
                <p className="text-2xl font-bold font-mono text-accent tracking-widest mt-1">{inviteCode}</p>
                <p className="text-[10px] text-gray-400 mt-1">Expires in 7 days · reload this page after players join</p>
              </div>
            ) : (
              <Button onClick={generateInvite} disabled={generatingCode}>
                {generatingCode ? 'Generating…' : 'Generate invite code'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {roster.map(p => {
              const selected = selectedPlayers.has(p.playerId);
              return (
                <label
                  key={p.playerId}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    selected ? 'bg-accent/5 border border-accent/20' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => togglePlayer(p.playerId)}
                    className="accent-accent w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{p.playerName}</p>
                    <p className="text-[10px] text-gray-400 truncate">@{p.username}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </Card>

      {/* 4. Confirm / create */}
      {error && (
        <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>
      )}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button
          onClick={createBlock}
          disabled={submitting || selectedPlayers.size === 0 || trainingDays.length !== 2}
          className="flex-1"
        >
          {submitting ? 'Creating…' : 'Create block'}
        </Button>
      </div>
    </div>
  );
}
