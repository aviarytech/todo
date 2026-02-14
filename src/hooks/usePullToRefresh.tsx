/**
 * Hook for pull-to-refresh functionality on mobile.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { haptic } from '../lib/haptics';

interface UsePullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Minimum pull distance to trigger refresh (default: 80) */
  threshold?: number;
  /** Element to attach the pull behavior to (default: document body) */
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface PullToRefreshState {
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Current pull distance in pixels */
  pullDistance: number;
  /** Whether the threshold has been reached */
  canRelease: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  containerRef,
}: UsePullToRefreshOptions): PullToRefreshState & {
  /** Ref to attach to the scrollable container */
  pullRef: React.RefObject<HTMLDivElement | null>;
  /** Manual trigger for refresh */
  refresh: () => Promise<void>;
} {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const pullRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  const canRelease = pullDistance >= threshold;

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setPullDistance(0);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef?.current || pullRef.current || document.body;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if at top of scroll
      const scrollTop = container === document.body 
        ? window.scrollY 
        : container.scrollTop;
      
      if (scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
        pullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || startYRef.current === null || isRefreshing) return;

      // Re-check scroll position — if we've scrolled away from top, cancel pull
      const scrollTop = container === document.body 
        ? window.scrollY 
        : container.scrollTop;
      if (scrollTop > 0) {
        pullingRef.current = false;
        startYRef.current = null;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;

      // Only track downward pulls; cancel if user scrolls up
      if (distance > 0) {
        // Apply resistance (diminishing returns)
        const resistance = 0.4;
        const adjustedDistance = distance * resistance;
        setPullDistance(Math.min(adjustedDistance, threshold * 1.5));
        
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        // User is scrolling up, not pulling down — cancel
        pullingRef.current = false;
        startYRef.current = null;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance >= threshold && !isRefreshing) {
        haptic('medium');
        refresh();
      } else {
        setPullDistance(0);
      }
      startYRef.current = null;
      pullingRef.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, threshold, isRefreshing, pullDistance, refresh]);

  return {
    isRefreshing,
    pullDistance,
    canRelease,
    pullRef,
    refresh,
  };
}

/**
 * Visual component for pull-to-refresh indicator.
 */
export function PullToRefreshIndicator({
  pullDistance,
  threshold,
  isRefreshing,
}: {
  pullDistance: number;
  threshold: number;
  isRefreshing: boolean;
}) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all"
      style={{ height: pullDistance > 0 || isRefreshing ? Math.max(pullDistance, isRefreshing ? 60 : 0) : 0 }}
    >
      <div
        className={`text-3xl transition-transform ${isRefreshing ? 'animate-spin-slow' : ''}`}
        style={{ transform: isRefreshing ? undefined : `rotate(${rotation}deg)` }}
      >
        💩
      </div>
    </div>
  );
}
