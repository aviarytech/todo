/**
 * Card displaying a list summary with improved design.
 *
 * Shows list name, ownership status, and visual indicators.
 * Features dark mode support and card hover effects.
 */

import { memo } from "react";
import { Link } from "react-router-dom";
import type { Doc } from "../../convex/_generated/dataModel";
import { useSettings } from "../hooks/useSettings";

interface ListCardProps {
  list: Doc<"lists">;
  currentUserDid: string;
  /** Show owner attribution for shared lists */
  showOwner?: boolean;
}

/** Truncate a DID for display, showing first and last parts */
function truncateDid(did: string): string {
  if (did.length <= 24) return did;
  return `${did.slice(0, 12)}...${did.slice(-8)}`;
}

/** Get a deterministic emoji based on list name */
function getListEmoji(name: string): string {
  const emojis = ['📋', '📝', '✅', '📌', '🎯', '📊', '🗂️', '📒', '📓', '🗒️'];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % emojis.length;
  return emojis[index];
}

/** Format relative time */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

export const ListCard = memo(function ListCard({ list, currentUserDid, showOwner }: ListCardProps) {
  const { haptic } = useSettings();
  const isOwner = list.ownerDid === currentUserDid;
  const emoji = getListEmoji(list.name);

  return (
    <Link
      to={`/list/${list._id}`}
      onClick={() => haptic('light')}
      className="group block bg-white dark:bg-gray-800/80 rounded-3xl shadow-sm hover:shadow-xl dark:shadow-gray-900/30 transition-all duration-300 p-6 sm:p-7 border border-gray-100/80 dark:border-gray-700/50 hover:border-amber-300/60 dark:hover:border-amber-600/60 backdrop-blur-sm"
      aria-label={`Open list: ${list.name}`}
    >
      <div className="flex items-center gap-5">
        {/* Emoji icon - larger, more prominent */}
        <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 dark:from-amber-900/40 dark:via-amber-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* List name and badges */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50 line-clamp-2 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors tracking-tight leading-tight">
              {list.name}
            </h3>
            {!isOwner && (
              <span className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-800 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/40">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Shared
              </span>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {isOwner ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">You</span>
              </span>
            ) : showOwner ? (
              <span className="flex items-center gap-1.5 truncate" title={list.ownerDid}>
                <svg className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">{truncateDid(list.ownerDid)}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Shared</span>
              </span>
            )}
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatRelativeTime(list.createdAt)}
            </span>
          </div>
        </div>

        {/* Arrow indicator - minimal */}
        <div className="hidden sm:flex flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-all group-hover:translate-x-1 duration-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
});
