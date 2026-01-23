# Feature: Offline Support with Sync

## Overview

The app works offline and syncs changes when connectivity is restored. Users can view, add, and check items without an internet connection.

## User Stories

### View Offline
- **As a** user without internet
- **I want to** see my lists and items
- **So that** I can reference them (e.g., at the grocery store)

### Edit Offline
- **As a** user without internet
- **I want to** add/check items
- **So that** I can update my list anywhere

### Sync on Reconnect
- **As a** user who was offline
- **I want to** have my changes synced automatically
- **So that** I don't lose work

## Acceptance Criteria

### Offline Access
1. App loads even without internet (cached shell)
2. Lists and items visible from cache
3. Offline indicator shown in UI
4. Clear feedback about offline state

### Offline Mutations
1. Can add items (queued locally)
2. Can check/uncheck items (queued locally)
3. Can reorder items (queued locally)
4. Cannot delete lists offline (too destructive)
5. Cannot publish/unpublish offline
6. Queue persists across app restarts

### Sync
1. Automatic sync when connection restored
2. Progress indicator during sync
3. Conflict resolution: server timestamp wins
4. Failed syncs retry with exponential backoff
5. User notified of sync conflicts

### Edge Cases
1. Multiple offline edits to same item → last local edit wins, then server reconciles
2. Item deleted by collaborator while offline → local changes discarded, notify user
3. List deleted while offline → clear local data, notify user

## Technical Specification

### Service Worker

```typescript
// src/workers/service-worker.ts

const CACHE_NAME = 'lisa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css',
];

// Cache static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and Convex API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('convex.cloud')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Return offline page for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});
```

### IndexedDB for Data Cache

```typescript
// src/lib/offline.ts

import { openDB, IDBPDatabase } from 'idb';

interface OfflineDB {
  lists: {
    key: string;
    value: List;
  };
  items: {
    key: string;
    value: Item;
    indexes: { byList: string };
  };
  mutations: {
    key: number;
    value: QueuedMutation;
  };
}

const DB_NAME = 'lisa-offline';
const DB_VERSION = 1;

export async function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  return openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Lists store
      db.createObjectStore('lists', { keyPath: '_id' });

      // Items store with index
      const itemsStore = db.createObjectStore('items', { keyPath: '_id' });
      itemsStore.createIndex('byList', 'listId');

      // Mutation queue
      db.createObjectStore('mutations', {
        keyPath: 'id',
        autoIncrement: true
      });
    },
  });
}
```

### Mutation Queue

```typescript
// src/lib/offline.ts

export interface QueuedMutation {
  id?: number;
  type: 'addItem' | 'checkItem' | 'uncheckItem' | 'reorderItem';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

export async function queueMutation(mutation: Omit<QueuedMutation, 'id'>) {
  const db = await getOfflineDB();
  await db.add('mutations', mutation);
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getOfflineDB();
  return db.getAll('mutations');
}

export async function clearMutation(id: number) {
  const db = await getOfflineDB();
  await db.delete('mutations', id);
}

export async function updateMutationRetry(id: number, retryCount: number) {
  const db = await getOfflineDB();
  const mutation = await db.get('mutations', id);
  if (mutation) {
    mutation.retryCount = retryCount;
    await db.put('mutations', mutation);
  }
}
```

### Sync Manager

```typescript
// src/lib/sync.ts

import { getQueuedMutations, clearMutation, updateMutationRetry } from './offline';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

export class SyncManager {
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  async sync(convex: ConvexReactClient) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.notify({ status: 'syncing' });

    const mutations = await getQueuedMutations();

    for (const mutation of mutations) {
      try {
        await this.executeMutation(convex, mutation);
        await clearMutation(mutation.id!);
      } catch (error) {
        if (mutation.retryCount >= MAX_RETRIES) {
          // Give up on this mutation
          await clearMutation(mutation.id!);
          this.notify({
            status: 'error',
            message: `Failed to sync: ${mutation.type}`,
          });
        } else {
          // Retry later
          await updateMutationRetry(mutation.id!, mutation.retryCount + 1);
          // Wait before next attempt
          await this.delay(RETRY_DELAYS[mutation.retryCount] || 16000);
        }
      }
    }

    this.isSyncing = false;
    this.notify({ status: 'synced' });
  }

  private async executeMutation(
    convex: ConvexReactClient,
    mutation: QueuedMutation
  ) {
    switch (mutation.type) {
      case 'addItem':
        await convex.mutation(api.items.addItem, mutation.payload as AddItemArgs);
        break;
      case 'checkItem':
        await convex.mutation(api.items.checkItem, mutation.payload as CheckItemArgs);
        break;
      // ... other mutation types
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(status: SyncStatus) {
    this.listeners.forEach(l => l(status));
  }
}

export const syncManager = new SyncManager();
```

### useOffline Hook

```typescript
// src/hooks/useOffline.tsx

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' });
  const [pendingCount, setPendingCount] = useState(0);
  const convex = useConvex();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncManager.sync(convex);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [convex]);

  useEffect(() => {
    return syncManager.subscribe(setSyncStatus);
  }, []);

  useEffect(() => {
    const updateCount = async () => {
      const mutations = await getQueuedMutations();
      setPendingCount(mutations.length);
    };
    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    isOnline,
    syncStatus,
    pendingCount,
    manualSync: () => syncManager.sync(convex),
  };
}
```

### Optimistic Updates

```typescript
// src/hooks/useItems.tsx

export function useItems(listId: Id<"lists">) {
  const { isOnline } = useOffline();
  const items = useQuery(api.items.getItems, { listId });
  const [optimisticItems, setOptimisticItems] = useState<Item[]>([]);
  const addItemMutation = useMutation(api.items.addItem);

  const addItem = useCallback(async (name: string) => {
    const optimisticItem: Item = {
      _id: `temp-${Date.now()}` as Id<"items">,
      listId,
      name,
      checked: false,
      createdByDid: user.did,
      createdAt: Date.now(),
    };

    // Show immediately
    setOptimisticItems(prev => [...prev, optimisticItem]);

    if (isOnline) {
      try {
        await addItemMutation({ listId, name, /* ... */ });
      } catch {
        // Remove optimistic item on failure
        setOptimisticItems(prev =>
          prev.filter(i => i._id !== optimisticItem._id)
        );
      }
    } else {
      // Queue for later
      await queueMutation({
        type: 'addItem',
        payload: { listId, name, /* ... */ },
        timestamp: Date.now(),
        retryCount: 0,
      });
    }
  }, [isOnline, listId, addItemMutation]);

  // Merge server items with optimistic items
  const allItems = useMemo(() => {
    if (!items) return optimisticItems;
    // Remove optimistic items that now exist on server
    const serverIds = new Set(items.map(i => i._id));
    const remaining = optimisticItems.filter(i => !serverIds.has(i._id));
    return [...items, ...remaining];
  }, [items, optimisticItems]);

  return { items: allItems, addItem, /* ... */ };
}
```

## UI Components

### OfflineIndicator
- Shows when offline (subtle banner)
- Shows pending sync count
- Tap to force sync attempt

### SyncStatus
- Syncing spinner
- Success/error feedback
- Conflict notifications

### OfflineToast
- "You're offline. Changes will sync when connected."
- Dismissible

## Conflict Resolution

**Strategy:** Last-write-wins with server as authority

1. **Same item edited:** Server timestamp wins
2. **Item deleted remotely:** Discard local changes, notify user
3. **List deleted remotely:** Clear local cache, redirect to home

```typescript
// Conflict detection in sync
if (serverItem.updatedAt > localMutation.timestamp) {
  // Server has newer data, discard local change
  await clearMutation(localMutation.id);
  notify({ type: 'conflict', message: 'Item was updated by another user' });
}
```

## Caching Strategy

1. **Lists:** Cache on every load, update on sync
2. **Items:** Cache on every load, update on sync
3. **Users:** Cache display names only
4. **TTL:** 7 days, refresh on app open
