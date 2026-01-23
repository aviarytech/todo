/**
 * Hook for tracking online/offline state and triggering sync on reconnect (Phase 5.4)
 *
 * Provides reactive online status, sync status from SyncManager, pending mutation count,
 * and a manual sync trigger function.
 */

import { useState, useEffect, useCallback } from "react";
import { useConvex } from "convex/react";
import { syncManager, type SyncStatus } from "../lib/sync";
import { getQueuedMutations } from "../lib/offline";

/**
 * Hook return type for useOffline
 */
export interface UseOfflineResult {
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Current sync status from SyncManager */
  syncStatus: SyncStatus;
  /** Number of pending mutations in the queue */
  pendingCount: number;
  /** Manually trigger a sync attempt */
  manualSync: () => void;
}

/**
 * React hook for offline state management.
 *
 * Tracks online/offline state via browser events, subscribes to SyncManager
 * for sync status updates, and polls for pending mutation count.
 *
 * Automatically triggers sync when coming back online.
 *
 * @example
 * ```tsx
 * function OfflineIndicator() {
 *   const { isOnline, syncStatus, pendingCount, manualSync } = useOffline();
 *
 *   if (!isOnline) {
 *     return (
 *       <div>
 *         Offline - {pendingCount} pending changes
 *         <button onClick={manualSync}>Retry</button>
 *       </div>
 *     );
 *   }
 *
 *   if (syncStatus.status === 'syncing') {
 *     return <div>Syncing...</div>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useOffline(): UseOfflineResult {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: "idle" });
  const [pendingCount, setPendingCount] = useState(0);
  const convex = useConvex();

  // Track online/offline events and trigger sync on reconnect
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncManager.sync(convex);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [convex]);

  // Subscribe to sync status updates from SyncManager
  useEffect(() => {
    return syncManager.subscribe(setSyncStatus);
  }, []);

  // Poll pending mutation count every 5 seconds
  useEffect(() => {
    const updateCount = async () => {
      const mutations = await getQueuedMutations();
      setPendingCount(mutations.length);
    };

    // Initial count
    updateCount();

    // Poll interval
    const interval = setInterval(updateCount, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Also update count when sync status changes (for immediate feedback)
  useEffect(() => {
    const updateCount = async () => {
      const mutations = await getQueuedMutations();
      setPendingCount(mutations.length);
    };

    // Update count when sync completes or errors
    if (syncStatus.status === "synced" || syncStatus.status === "error") {
      updateCount();
    }
  }, [syncStatus]);

  // Manual sync trigger
  const manualSync = useCallback(() => {
    syncManager.sync(convex);
  }, [convex]);

  return {
    isOnline,
    syncStatus,
    pendingCount,
    manualSync,
  };
}
