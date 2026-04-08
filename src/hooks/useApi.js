import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api';

// ── Token management ──────────────────────────────

export function getToken() {
  return localStorage.getItem('composed_token');
}

export function setTokens(token, refreshToken) {
  localStorage.setItem('composed_token', token);
  if (refreshToken) localStorage.setItem('composed_refresh', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('composed_token');
  localStorage.removeItem('composed_refresh');
}

function getRefreshToken() {
  return localStorage.getItem('composed_refresh');
}

// ── Error notification ────────────────────────────

function notifyError(message) {
  window.dispatchEvent(new CustomEvent('api-error', { detail: message }));
}

// Dispatch auth failure so App.jsx can redirect to login
function notifyAuthFailure() {
  window.dispatchEvent(new CustomEvent('auth-failure'));
}

// ── Core fetch with auth ──────────────────────────

let refreshPromise = null; // Prevent concurrent refresh calls

async function attemptRefresh() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('composed_token', data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const method = (options.method || 'GET').toUpperCase();
  const isWrite = method !== 'GET' && method !== 'HEAD';

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;

  try {
    let res = await fetch(url, {
      headers,
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // On 401, try refreshing the token once
    if (res.status === 401 && token) {
      const refreshed = await attemptRefresh();
      if (refreshed) {
        const newToken = getToken();
        const retryHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${newToken}` };
        res = await fetch(url, {
          headers: retryHeaders,
          ...options,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
      }

      if (res.status === 401) {
        clearTokens();
        notifyAuthFailure();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `API ${res.status}: ${res.statusText}`);
    }
    return res.json();
  } catch (err) {
    // Network failure (no internet, server unreachable)
    const isNetworkError = err instanceof TypeError || err.message === 'Failed to fetch' || err.message.includes('NetworkError');

    if (isNetworkError && isWrite) {
      // Queue the write for later sync
      const { enqueueWrite } = await import('../services/offlineQueue.js');
      await enqueueWrite(method, path, options.body);
      notifyOfflineWrite();
      // Return a synthetic success so the UI doesn't error
      return { ok: true, queued: true, offline: true };
    }

    throw err;
  }
}

// Notify the app that a write was queued offline
function notifyOfflineWrite() {
  window.dispatchEvent(new CustomEvent('offline-write-queued'));
}

// Notify the app that the queue has been flushed
function notifyQueueFlushed(result) {
  window.dispatchEvent(new CustomEvent('offline-queue-flushed', { detail: result }));
}

// Flush the offline queue — call on reconnect
export async function syncOfflineQueue() {
  const { flushQueue, getPendingCount: getCount } = await import('../services/offlineQueue.js');
  const token = getToken();
  const result = await flushQueue(token);
  notifyQueueFlushed(result);
  return result;
}

// Re-export for OfflineIndicator
export { getPendingCount } from '../services/offlineQueue.js';

/**
 * Drop-in replacement for useLocalStorage for array-based collections.
 */
export function useApiCollection(endpoint, initialValue = []) {
  const [items, setItemsInternal] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const prevRef = useRef(initialValue);

  useEffect(() => {
    let cancelled = false;
    apiFetch(endpoint)
      .then(data => {
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : [];
          setItemsInternal(arr);
          prevRef.current = arr;
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          notifyError(`Failed to load data`);
          setLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [endpoint]);

  const setItems = useCallback((updater) => {
    const prev = prevRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    prevRef.current = next;
    setItemsInternal(next);
    syncDiff(endpoint, prev, next);
  }, [endpoint]);

  return [items, setItems, loaded];
}

/**
 * Drop-in replacement for useLocalStorage for singleton objects (settings, personalRecords).
 */
export function useApiSingleton(endpoint, initialValue) {
  const [value, setValueInternal] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const prevRef = useRef(initialValue);

  useEffect(() => {
    let cancelled = false;
    apiFetch(endpoint)
      .then(data => {
        if (!cancelled) {
          const val = data ?? initialValue;
          setValueInternal(val);
          prevRef.current = val;
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          notifyError(`Failed to load data`);
          setLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [endpoint]);

  const setValue = useCallback((updater) => {
    const prev = prevRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    prevRef.current = next;
    setValueInternal(next);
    apiFetch(endpoint, { method: 'PUT', body: next })
      .catch((err) => notifyError(err.message));
  }, [endpoint]);

  return [value, setValue, loaded];
}

/**
 * For simple string arrays (customDrills) — POST to add, DELETE to remove.
 */
export function useApiStringList(endpoint, initialValue = []) {
  const [items, setItemsInternal] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const prevRef = useRef(initialValue);

  useEffect(() => {
    let cancelled = false;
    apiFetch(endpoint)
      .then(data => {
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : [];
          setItemsInternal(arr);
          prevRef.current = arr;
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          notifyError(`Failed to load data`);
          setLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [endpoint]);

  const setItems = useCallback((updater) => {
    const prev = prevRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    prevRef.current = next;
    setItemsInternal(next);
    const added = next.filter(x => !prev.includes(x));
    const removed = prev.filter(x => !next.includes(x));
    for (const name of added) {
      apiFetch(endpoint, { method: 'POST', body: { name } })
        .catch((err) => notifyError(err.message));
    }
    for (const name of removed) {
      apiFetch(`${endpoint}/${encodeURIComponent(name)}`, { method: 'DELETE' })
        .catch((err) => notifyError(err.message));
    }
  }, [endpoint]);

  return [items, setItems, loaded];
}

// Detect create/update/delete between old and new arrays and fire API calls
function syncDiff(endpoint, prev, next) {
  if (!Array.isArray(prev) || !Array.isArray(next)) return;

  const prevMap = new Map(prev.map(item => [item.id, item]));
  const nextMap = new Map(next.map(item => [item.id, item]));

  for (const [id] of prevMap) {
    if (!nextMap.has(id)) {
      apiFetch(`${endpoint}/${id}`, { method: 'DELETE' })
        .catch((err) => notifyError(err.message));
    }
  }

  for (const [id, item] of nextMap) {
    if (!prevMap.has(id)) {
      apiFetch(endpoint, { method: 'POST', body: item })
        .catch((err) => notifyError(err.message));
    } else if (JSON.stringify(prevMap.get(id)) !== JSON.stringify(item)) {
      apiFetch(`${endpoint}/${id}`, { method: 'PUT', body: item })
        .catch((err) => notifyError(err.message));
    }
  }
}
