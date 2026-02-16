/**
 * Streak badge component — displays current streak count.
 * 
 * Compact pill showing streak emoji and count.
 * Only renders when streak >= 1.
 */

import { memo } from 'react';
import { getStreakEmoji } from '../lib/streaks';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md';
}

export const StreakBadge = memo(function StreakBadge({ streak, size = 'md' }: StreakBadgeProps) {
  if (streak < 1) return null;

  const emoji = getStreakEmoji(streak);

  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40">
        <span>{emoji}</span>
        <span>{streak}d</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40 shadow-sm">
      <span className="text-base">{emoji}</span>
      <span>{streak} day{streak !== 1 ? 's' : ''}</span>
    </span>
  );
});
