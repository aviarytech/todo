/**
 * Visual indicator for pull-to-refresh gesture.
 * Shows a spinner/arrow that responds to pull distance.
 */

import React from "react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isPastThreshold?: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  isPastThreshold: isPastThresholdProp,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const isPastThreshold = isPastThresholdProp ?? progress >= 1;
  const rotation = isPastThreshold ? 180 : progress * 180;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
      style={{ height: `${pullDistance}px` }}
    >
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
          isRefreshing
            ? "bg-amber-100 dark:bg-amber-900/30"
            : isPastThreshold
              ? "bg-amber-100 dark:bg-amber-900/30 scale-110"
              : "bg-gray-100 dark:bg-gray-800"
        }`}
        style={{ opacity: Math.min(progress * 1.5, 1) }}
      >
        {isRefreshing ? (
          <span className="text-xl animate-spin">💩</span>
        ) : (
          <span
            className="text-xl transition-transform duration-150 ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            💩
          </span>
        )}
      </div>
    </div>
  );
}
