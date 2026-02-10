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
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className={`w-5 h-5 transition-colors duration-200 ${
              isPastThreshold
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-400 dark:text-gray-500"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.15s ease-out" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
