/**
 * Hook for optimistic item management (Phase 5.5)
 *
 * Provides optimistic UI updates for item mutations, queuing mutations when
 * offline and merging with server state when back online.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useOffline } from "./useOffline";
import { queueMutation, cacheItems, getCachedItemsByList, type OfflineItem } from "../lib/offline";

/**
 * Extended item type with optimistic flag for UI styling
 */
export interface OptimisticItem extends Doc<"items"> {
  /** Flag for UI styling (e.g., dimmed) - indicates item has pending changes */
  _isOptimistic?: boolean;
}

/**
 * Hook for managing items with optimistic updates.
 *
 * Wraps Convex queries and mutations with optimistic update logic:
 * - Shows new items immediately with temp IDs
 * - Shows check/uncheck changes immediately
 * - Queues mutations when offline for later sync
 * - Rolls back on failure
 * - Cleans up optimistic state when server catches up
 *
 * @param listId - The ID of the list to manage items for
 * @returns Items array and mutation functions
 *
 * @example
 * ```tsx
 * function ItemList({ listId }) {
 *   const { items, addItem, checkItem, uncheckItem, isLoading } = useOptimisticItems(listId);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <>
 *       {items.map(item => (
 *         <div key={item._id} className={item._isOptimistic ? "opacity-60" : ""}>
 *           {item.name}
 *         </div>
 *       ))}
 *     </>
 *   );
 * }
 * ```
 */
export function useOptimisticItems(listId: Id<"lists">) {
  const { isOnline } = useOffline();
  const serverItems = useQuery(api.items.getListItems, { listId });
  const [optimisticItems, setOptimisticItems] = useState<OptimisticItem[]>([]);
  const [cachedItems, setCachedItems] = useState<OfflineItem[]>([]);

  // Cache items when online and data is available
  useEffect(() => {
    if (serverItems && isOnline) {
      const itemsToCache = serverItems.map((item) => ({
        _id: item._id,
        listId: item.listId,
        name: item.name,
        checked: item.checked,
        createdByDid: item.createdByDid,
        checkedByDid: item.checkedByDid,
        createdAt: item.createdAt,
        checkedAt: item.checkedAt,
        order: item.order,
      }));
      cacheItems(itemsToCache);
    }
  }, [serverItems, isOnline]);

  // Load cached items when offline
  useEffect(() => {
    if (!isOnline && !serverItems) {
      getCachedItemsByList(listId).then(setCachedItems);
    }
  }, [isOnline, serverItems, listId]);

  // Derive usingCache from whether we're showing cached data
  const usingCache = !isOnline && !serverItems && cachedItems.length > 0;

  const addItemMutation = useMutation(api.items.addItem);
  const checkItemMutation = useMutation(api.items.checkItem);
  const uncheckItemMutation = useMutation(api.items.uncheckItem);
  const reorderItemsMutation = useMutation(api.items.reorderItems);

  /**
   * Add item with optimistic update.
   * Shows the item immediately, then syncs with server or queues for offline.
   */
  const addItem = useCallback(
    async (args: {
      name: string;
      createdByDid: string;
      legacyDid?: string;
      createdAt: number;
    }) => {
      const tempId = `temp-${Date.now()}` as Id<"items">;
      const optimistic: OptimisticItem = {
        _id: tempId,
        _creationTime: Date.now(),
        listId,
        name: args.name,
        checked: false,
        createdByDid: args.createdByDid,
        createdAt: args.createdAt,
        _isOptimistic: true,
      };

      setOptimisticItems((prev) => [...prev, optimistic]);

      if (isOnline) {
        try {
          await addItemMutation({ listId, ...args });
        } catch (err) {
          // Rollback: remove the optimistic item on failure
          setOptimisticItems((prev) => prev.filter((i) => i._id !== tempId));
          throw err;
        }
      } else {
        await queueMutation({
          type: "addItem",
          payload: { listId, ...args },
          timestamp: Date.now(),
          retryCount: 0,
        });
      }
    },
    [isOnline, listId, addItemMutation]
  );

  /**
   * Check item with optimistic update.
   * Shows the checked state immediately, then syncs or queues.
   */
  const checkItem = useCallback(
    async (itemId: Id<"items">, checkedByDid: string, legacyDid?: string) => {
      const checkedAt = Date.now();

      // Find original state for potential rollback
      const originalItem = [...(serverItems ?? []), ...optimisticItems].find(
        (i) => i._id === itemId
      );

      setOptimisticItems((prev) => {
        // If item exists in optimistic list, update it
        const exists = prev.some((i) => i._id === itemId);
        if (exists) {
          return prev.map((i) =>
            i._id === itemId
              ? {
                  ...i,
                  checked: true,
                  checkedByDid,
                  checkedAt,
                  _isOptimistic: true,
                }
              : i
          );
        }
        // If not in optimistic list, add the server item with optimistic update
        if (originalItem) {
          return [
            ...prev,
            {
              ...originalItem,
              checked: true,
              checkedByDid,
              checkedAt,
              _isOptimistic: true,
            },
          ];
        }
        return prev;
      });

      if (isOnline) {
        try {
          await checkItemMutation({ itemId, checkedByDid, legacyDid, checkedAt });
        } catch (err) {
          // Rollback: remove the optimistic state
          setOptimisticItems((prev) => prev.filter((i) => i._id !== itemId));
          throw err;
        }
      } else {
        await queueMutation({
          type: "checkItem",
          payload: { itemId, checkedByDid, legacyDid, checkedAt },
          timestamp: Date.now(),
          retryCount: 0,
        });
      }
    },
    [isOnline, checkItemMutation, serverItems, optimisticItems]
  );

  /**
   * Uncheck item with optimistic update.
   * Shows the unchecked state immediately, then syncs or queues.
   */
  const uncheckItem = useCallback(
    async (itemId: Id<"items">, userDid: string, legacyDid?: string) => {
      const originalItem = [...(serverItems ?? []), ...optimisticItems].find(
        (i) => i._id === itemId
      );

      setOptimisticItems((prev) => {
        const exists = prev.some((i) => i._id === itemId);
        if (exists) {
          return prev.map((i) =>
            i._id === itemId
              ? {
                  ...i,
                  checked: false,
                  checkedByDid: undefined,
                  checkedAt: undefined,
                  _isOptimistic: true,
                }
              : i
          );
        }
        if (originalItem) {
          return [
            ...prev,
            {
              ...originalItem,
              checked: false,
              checkedByDid: undefined,
              checkedAt: undefined,
              _isOptimistic: true,
            },
          ];
        }
        return prev;
      });

      if (isOnline) {
        try {
          await uncheckItemMutation({ itemId, userDid, legacyDid });
        } catch (err) {
          // Rollback: remove the optimistic state
          setOptimisticItems((prev) => prev.filter((i) => i._id !== itemId));
          throw err;
        }
      } else {
        await queueMutation({
          type: "uncheckItem",
          payload: { itemId, userDid, legacyDid },
          timestamp: Date.now(),
          retryCount: 0,
        });
      }
    },
    [isOnline, uncheckItemMutation, serverItems, optimisticItems]
  );

  /**
   * Reorder items.
   * For reorder, optimistic UI is already handled by drag-drop visuals.
   * Just queue if offline, execute if online.
   */
  const reorderItems = useCallback(
    async (itemIds: Id<"items">[], userDid: string, legacyDid?: string) => {
      if (isOnline) {
        await reorderItemsMutation({ listId, itemIds, userDid, legacyDid });
      } else {
        await queueMutation({
          type: "reorderItem",
          payload: { listId, itemIds, userDid, legacyDid },
          timestamp: Date.now(),
          retryCount: 0,
        });
      }
    },
    [isOnline, listId, reorderItemsMutation]
  );

  /**
   * Merge server items with optimistic items, filtering out stale optimistic items.
   * Falls back to cached items when offline and server data is unavailable.
   *
   * - Apply optimistic updates to matching server items (only if server hasn't caught up)
   * - Include new optimistic items (temp IDs) that don't exist on server yet
   * - Automatically filter stale optimistic items based on server state
   *
   * Note: Stale optimistic items remain in state but are filtered out during merge.
   * This is intentional to avoid calling setState in effects/render, which can cause
   * cascading renders. The state cleanup happens naturally when mutations complete
   * (rollback on error) or items are eventually garbage collected.
   */
  const items = useMemo((): OptimisticItem[] => {
    // Use cached items when offline and no server data
    const baseItems: Doc<"items">[] | undefined = serverItems ?? (!isOnline && cachedItems.length > 0
      ? (cachedItems as unknown as Doc<"items">[])
      : undefined);

    if (!baseItems) return optimisticItems;

    const baseIds = new Set(baseItems.map((i) => i._id));

    // Filter optimistic items to only keep those that are still relevant
    const activeOptimisticItems = optimisticItems.filter((o) => {
      // For check/uncheck updates on existing items
      if (!(o._id as string).startsWith("temp-")) {
        const baseItem = baseItems.find((s) => s._id === o._id);
        // Keep if base hasn't caught up yet (checked state differs)
        return baseItem && baseItem.checked !== o.checked;
      }
      // For new items (temp IDs), keep if base doesn't have matching item yet
      const existsInBase = baseItems.some(
        (s) =>
          s.name === o.name &&
          s.createdByDid === o.createdByDid &&
          Math.abs(s.createdAt - o.createdAt) < 5000
      );
      return !existsInBase;
    });

    // Apply active optimistic updates to base items
    const merged = baseItems.map((baseItem) => {
      const optimistic = activeOptimisticItems.find((o) => o._id === baseItem._id);
      return optimistic ?? baseItem;
    });

    // Add optimistic items that don't exist in base yet (temp IDs)
    const newOptimistic = activeOptimisticItems.filter(
      (o) =>
        (o._id as string).startsWith("temp-") || !baseIds.has(o._id)
    );

    return [...merged, ...newOptimistic];
  }, [serverItems, optimisticItems, isOnline, cachedItems]);

  return {
    items,
    addItem,
    checkItem,
    uncheckItem,
    reorderItems,
    isLoading: serverItems === undefined && (!usingCache || cachedItems.length === 0),
    /** Whether items are being displayed from cache (offline fallback) */
    usingCache,
  };
}
