// Player-side: "am I in an active 4-week block, and what's due today?"
//
// Returns { block, loading, refresh } — block is null when the player isn't in
// any block, or the API response object (which includes `benchmarkDue` and
// `sessionDueToday` flags) when they are.
//
// Called by the Dashboard to render a due-state pill. Auto-refreshes on window
// focus so a player who finishes a benchmark in another tab sees the pill clear.

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './useApi';

export function useActiveBlock() {
  const [block, setBlock] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    apiFetch('/blocks/active-for-player')
      .then(data => setBlock(data))
      .catch(() => setBlock(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    // Refresh when the tab regains focus — cheap way to pick up benchmark/session
    // logs done elsewhere (e.g., player recorded a benchmark on another device).
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return { block, loading, refresh };
}
