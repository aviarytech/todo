/**
 * Pull-to-refresh hook for mobile touch interactions.
 * 
 * Since Convex uses reactive queries (data is always live), this hook
 * provides visual feedback that data is fresh rather than actually
 * re-fetching. It can optionally call a callback for additional refresh logic.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";

interface PullToRefreshOptions {
  /** Called when user completes a pull-to-refresh gesture */
  onRefresh?: () => Promise<void> | void;
  /** Minimum pull distance in px to trigger refresh (default: 80) */
  threshold?: number;
  /** Max pull distance in px (default: 150) */
  maxPull?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Scrollable container ref — if omitted, uses document.scrollingElement */
  containerRef?: React.RefObject<HTMLElement | null>;
}

export function usePullToRefresh(options: PullToRefreshOptions = {}) {
  const {
    onRefresh,
    threshold = 80,
    maxPull = 150,
    enabled = true,
    containerRef,
  } = options;

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPastThreshold, setIsPastThreshold] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const pullRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshing) return;
      // Only start pull if scrolled to top
      const scrollEl = containerRef?.current || document.scrollingElement || document.documentElement;
      if (scrollEl.scrollTop > 5) return;
      touchStartY.current = e.touches[0].clientY;
    },
    [enabled, isRefreshing, containerRef]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshing || touchStartY.current === null) return;

      // Re-check scroll position — cancel if scrolled away from top
      const scrollEl = containerRef?.current || document.scrollingElement || document.documentElement;
      if (scrollEl.scrollTop > 5) {
        touchStartY.current = null;
        setPullDistance(0);
        setIsPastThreshold(false);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;

      if (diff > 0) {
        const distance = Math.min(diff * 0.5, maxPull);
        setPullDistance(distance);
        setIsPastThreshold(distance >= threshold);
        if (diff > 10) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        setIsPastThreshold(false);
      }
    },
    [enabled, isRefreshing, threshold, maxPull, containerRef]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || touchStartY.current === null) return;
    touchStartY.current = null;

    if (isPastThreshold) {
      setPullDistance(threshold * 0.6);
      setIsRefreshing(true);

      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      } finally {
        setPullDistance(0);
        setIsRefreshing(false);
        setIsPastThreshold(false);
      }
    } else {
      setPullDistance(0);
      setIsPastThreshold(false);
    }
  }, [enabled, isPastThreshold, threshold, onRefresh]);

  useEffect(() => {
    const container = pullRef.current;
    if (!container || !enabled) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    pullRef,
    pullDistance,
    isRefreshing,
    isPastThreshold,
  };
}

// Re-export the indicator component for convenience
export { PullToRefreshIndicator } from "../components/PullToRefreshIndicator";
