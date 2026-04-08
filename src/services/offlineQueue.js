/**
 * Offline Write Queue — IndexedDB-backed queue for failed API writes.
 *
 * When the network is down, write operations (POST/PUT/DELETE) are stored
 * in IndexedDB. When connectivity returns, they're replayed in order.
 * Data survives page reloads and app restarts.
 */

import { openDB } from 'idb';

const DB_NAME = 'composed-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-writes';
const MAX_RETRIES = 5;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Add a failed write to the queue.
 */
export async function enqueueWrite(method, path, body, headers = {}) {
  try {
    const db = await getDB();
    await db.add(STORE_NAME, {
      method,
      path,
      body: body ? JSON.stringify(body) : null,
      headers: JSON.stringify(headers),
      timestamp: Date.now(),
      retries: 0,
      status: 'pending', // 'pending' | 'syncing' | 'failed'
      error: null,
    });
  } catch (err) {
    console.error('[OfflineQueue] Failed to enqueue write:', err);
  }
}

/**
 * Get all pending writes, oldest first.
 */
export async function dequeueAll() {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex(STORE_NAME, 'timestamp');
    return all.filter(item => item.status !== 'failed' || item.retries < MAX_RETRIES);
  } catch (err) {
    console.error('[OfflineQueue] Failed to dequeue:', err);
    return [];
  }
}

/**
 * Remove a successfully synced write.
 */
export async function removeWrite(id) {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  } catch (err) {
    console.error('[OfflineQueue] Failed to remove write:', err);
  }
}

/**
 * Mark a write as failed with error info.
 */
export async function markFailed(id, error) {
  try {
    const db = await getDB();
    const item = await db.get(STORE_NAME, id);
    if (!item) return;
    item.retries += 1;
    item.error = error;
    item.status = item.retries >= MAX_RETRIES ? 'failed' : 'pending';
    await db.put(STORE_NAME, item);
  } catch (err) {
    console.error('[OfflineQueue] Failed to mark write as failed:', err);
  }
}

/**
 * Get count of pending writes (for UI badge).
 */
export async function getPendingCount() {
  try {
    const db = await getDB();
    const all = await db.getAll(STORE_NAME);
    return all.filter(item => item.status === 'pending' || item.status === 'syncing').length;
  } catch {
    return 0;
  }
}

/**
 * Flush the queue — attempt to sync all pending writes to the server.
 * Called on reconnect. Returns { synced, failed, remaining }.
 */
export async function flushQueue(authToken) {
  const items = await dequeueAll();
  if (items.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    if (item.status === 'failed' && item.retries >= MAX_RETRIES) {
      failed++;
      continue;
    }

    try {
      // Mark as syncing
      const db = await getDB();
      item.status = 'syncing';
      await db.put(STORE_NAME, item);

      // Replay the API call
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      const res = await fetch(`/api${item.path}`, {
        method: item.method,
        headers,
        body: item.body || undefined,
      });

      if (res.ok || res.status === 409) {
        // Success or conflict (already exists) — remove from queue
        await removeWrite(item.id);
        synced++;
      } else {
        // Server error — retry later
        await markFailed(item.id, `Server returned ${res.status}`);
        failed++;
      }
    } catch (err) {
      // Network still down — stop trying
      await markFailed(item.id, err.message);
      failed++;
      // If it's a network error, stop flushing (no point retrying rest)
      if (err instanceof TypeError && err.message.includes('fetch')) break;
    }
  }

  const remaining = await getPendingCount();
  return { synced, failed, remaining };
}

/**
 * Clear all permanently failed items from the queue.
 */
export async function clearFailed() {
  try {
    const db = await getDB();
    const all = await db.getAll(STORE_NAME);
    for (const item of all) {
      if (item.status === 'failed' && item.retries >= MAX_RETRIES) {
        await db.delete(STORE_NAME, item.id);
      }
    }
  } catch (err) {
    console.error('[OfflineQueue] Failed to clear:', err);
  }
}
