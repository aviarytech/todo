/**
 * ProfileBadge component showing user identity and logout.
 * Features improved design and dark mode support.
 */

import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { isDemoMode } from '../lib/demoMode';

export function ProfileBadge() {
  const { user, logout } = useAuth();
  const { haptic } = useSettings();
  const demoMode = isDemoMode();

  const did = user?.did;
  if (!did && !demoMode) return null;

  // Get first 8 and last 4 chars of DID for display
  const displayDid = demoMode ? 'demo-user' : did;
  const shortDid = displayDid && displayDid.length > 16 
    ? `${displayDid.slice(0, 8)}...${displayDid.slice(-4)}`
    : displayDid || 'User';

  return (
    <div className="flex items-center gap-2">
      {/* Demo mode indicator */}
      {demoMode && (
        <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold rounded-full border border-purple-200 dark:border-purple-800">
          Demo
        </span>
      )}
      
      {/* DID badge */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400" title={did || 'Demo User'}>
          {shortDid}
        </span>
      </div>

      {/* Logout button */}
      <button
        onClick={() => {
          haptic('medium');
          logout();
        }}
        className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
        title="Sign out"
        aria-label="Sign out"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
