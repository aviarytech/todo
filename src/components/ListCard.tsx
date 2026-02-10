/**
 * Card displaying a list summary — modern minimal design.
 *
 * Clean card with warm amber accents, subtle shadows, rounded corners.
 * Optimized for mobile with good touch targets and whitespace.
 */

import { memo } from "react";
import { Link } from "react-router-dom";
import type { Doc } from "../../convex/_generated/dataModel";
import { useSettings } from "../hooks/useSettings";

interface ListCardProps {
  list: Doc<"lists">;
  currentUserDid: string;
  showOwner?: boolean;
}

function truncateDid(did: string): string {
  if (did.length <= 24) return did;
  return `${did.slice(0, 12)}...${did.slice(-8)}`;
}

function getListEmoji(name: string): string {
  const emojis = ['📋', '📝', '✅', '📌', '🎯', '📊', '🗂️', '📒', '📓', '🗒️'];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % emojis.length;
  return emojis[index];
}

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
      className="group block bg-white dark:bg-stone-800/70 rounded-2xl shadow-sm shadow-stone-200/60 dark:shadow-none hover:shadow-md hover:shadow-stone-200/80 dark:hover:shadow-none transition-all duration-200 p-5 border border-stone-100 dark:border-stone-700/40 hover:border-amber-300/50 dark:hover:border-amber-700/40 active:scale-[0.98]"
      aria-label={`Open list: ${list.name}`}
    >
      <div className="flex items-center gap-4">
        {/* Emoji badge */}
        <div className="flex-shrink-0 w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-200">
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* List name */}
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              {list.name}
            </h3>
            {!isOwner && (
              <span className="flex-shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                Shared
              </span>
            )}
          </div>

          {/* Meta line */}
          <p className="text-[13px] text-stone-400 dark:text-stone-500">
            {showOwner && !isOwner ? truncateDid(list.ownerDid) : formatRelativeTime(list.createdAt)}
          </p>
        </div>

        {/* Chevron */}
        <svg className="w-5 h-5 flex-shrink-0 text-stone-300 dark:text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
});
