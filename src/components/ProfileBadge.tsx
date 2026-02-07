/**
 * ProfileBadge component showing user identity and logout.
 * Features improved design and dark mode support.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useSettings } from '../hooks/useSettings';

export function ProfileBadge() {
  const { logout } = useAuth();
  const { did } = useCurrentUser();
  const { haptic } = useSettings();

  if (!did) return null;

  // Get first 8 and last 4 chars of DID for display
  const shortDid = did.length > 16 
    ? `${did.slice(0, 8)}...${did.slice(-4)}`
    : did;

  return (
    <div className="flex items-center gap-2">
      {/* DID badge - now links to profile */}
      <Link 
        to="/profile"
        onClick={() => haptic('light')}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
        title={did}
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {shortDid}
        </span>
      </Link>

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
