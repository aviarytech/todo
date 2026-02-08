/**
 * Shows a banner when the app is offline.
 * Features improved design and dark mode support.
 */

import { useOffline } from '../../hooks/useOffline';

export function OfflineIndicator() {
  const { isOnline } = useOffline();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-up" role="alert" aria-live="assertive">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 text-center text-sm font-medium shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span>You're offline — changes will sync when reconnected</span>
        </div>
      </div>
    </div>
  );
}
