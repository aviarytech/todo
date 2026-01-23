/**
 * Hook for optimistic item management (Phase 5.5)
 *
 * Provides optimistic UI updates for item mutations, queuing mutations when
 * offline and merging with server state when back online.
 */

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useOffline } from "./useOffline";
import { queueMutation } from "../lib/offline";

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
    if (!serverItems) return optimisticItems;

    const serverIds = new Set(serverItems.map((i) => i._id));

    // Filter optimistic items to only keep those that are still relevant
    const activeOptimisticItems = optimisticItems.filter((o) => {
      // For check/uncheck updates on existing items
      if (!(o._id as string).startsWith("temp-")) {
        const serverItem = serverItems.find((s) => s._id === o._id);
        // Keep if server hasn't caught up yet (checked state differs)
        return serverItem && serverItem.checked !== o.checked;
      }
      // For new items (temp IDs), keep if server doesn't have matching item yet
      const existsOnServer = serverItems.some(
        (s) =>
          s.name === o.name &&
          s.createdByDid === o.createdByDid &&
          Math.abs(s.createdAt - o.createdAt) < 5000
      );
      return !existsOnServer;
    });

    // Apply active optimistic updates to server items
    const merged = serverItems.map((serverItem) => {
      const optimistic = activeOptimisticItems.find((o) => o._id === serverItem._id);
      return optimistic ?? serverItem;
    });

    // Add optimistic items that don't exist on server yet (temp IDs)
    const newOptimistic = activeOptimisticItems.filter(
      (o) =>
        (o._id as string).startsWith("temp-") || !serverIds.has(o._id)
    );

    return [...merged, ...newOptimistic];
  }, [serverItems, optimisticItems]);

  return {
    items,
    addItem,
    checkItem,
    uncheckItem,
    reorderItems,
    isLoading: serverItems === undefined,
  };
}
