import { useState, useEffect, useCallback } from 'react';
import { syncOfflineQueue } from '../../hooks/useApi';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { synced, failed }

  // Track online/offline state
  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      // Auto-flush queue on reconnect
      handleSync();
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Listen for offline write events to update pending count
  useEffect(() => {
    const onQueued = async () => {
      const { getPendingCount } = await import('../../services/offlineQueue.js');
      setPendingCount(await getPendingCount());
    };
    const onFlushed = (e) => {
      setSyncResult(e.detail);
      setPendingCount(e.detail?.remaining || 0);
      // Clear sync result after 3 seconds
      setTimeout(() => setSyncResult(null), 3000);
    };

    window.addEventListener('offline-write-queued', onQueued);
    window.addEventListener('offline-queue-flushed', onFlushed);
    return () => {
      window.removeEventListener('offline-write-queued', onQueued);
      window.removeEventListener('offline-queue-flushed', onFlushed);
    };
  }, []);

  // Check pending count on mount
  useEffect(() => {
    (async () => {
      try {
        const { getPendingCount } = await import('../../services/offlineQueue.js');
        setPendingCount(await getPendingCount());
      } catch { /* IndexedDB not available */ }
    })();
  }, []);

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncOfflineQueue();
    } catch { /* ignore */ }
    setSyncing(false);
  }, [syncing]);

  // Show sync success banner briefly
  if (syncResult && syncResult.synced > 0 && !offline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white text-center text-xs font-medium py-1.5" role="alert">
        ✓ {syncResult.synced} change{syncResult.synced !== 1 ? 's' : ''} synced successfully
      </div>
    );
  }

  // Syncing in progress
  if (syncing) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-accent text-white text-center text-xs font-medium py-1.5" role="alert">
        Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...
      </div>
    );
  }

  // Offline with pending writes
  if (offline && pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-xs font-medium py-1.5" role="alert">
        Offline — {pendingCount} change{pendingCount !== 1 ? 's' : ''} saved locally, will sync when you reconnect
      </div>
    );
  }

  // Offline with no pending writes
  if (offline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center text-xs font-medium py-1.5" role="alert">
        You are offline — changes will be saved locally
      </div>
    );
  }

  // Online with pending writes (e.g. sync failed, manual retry needed)
  if (pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-100 text-amber-800 text-center text-xs font-medium py-1.5 flex items-center justify-center gap-2" role="alert">
        <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} waiting to sync</span>
        <button onClick={handleSync} className="underline font-semibold">Sync Now</button>
      </div>
    );
  }

  return null;
}
