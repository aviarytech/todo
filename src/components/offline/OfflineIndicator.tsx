/**
 * Offline status indicator banner (Phase 5.6)
 *
 * Displays a banner when the user is offline or when there are pending changes to sync.
 * Uses ARIA live regions for accessibility.
 */

import { useOffline } from "../../hooks/useOffline";

/**
 * Banner component that appears at the top of the screen when offline
 * or when there are pending changes being synced.
 *
 * - Red banner when offline: "You are offline. Changes will sync when you reconnect."
 * - Yellow banner when online but syncing: "Syncing X pending changes..."
 * - Hidden when online with no pending changes
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, syncStatus } = useOffline();

  // Hide when online with no pending changes
  if (isOnline && pendingCount === 0) return null;

  const isSyncing = syncStatus.status === "syncing";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
        isOnline ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
      }`}
    >
      {!isOnline ? (
        <>You are offline. Changes will sync when you reconnect.</>
      ) : isSyncing ? (
        <>
          Syncing {pendingCount} pending change{pendingCount !== 1 ? "s" : ""}...
        </>
      ) : (
        <>
          {pendingCount} pending change{pendingCount !== 1 ? "s" : ""} to sync
        </>
      )}
    </div>
  );
}
