/**
 * usePullToRefresh - Pull-to-refresh gesture for mobile.
 * Also exports PullToRefreshIndicator component.
 */
import React, { useRef, useState, useEffect, useCallback } from "react";

const MAX_PULL = 120;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

interface UsePullToRefreshResult {
  pullRef: React.RefObject<HTMLDivElement | null>;
  pullDistance: number;
  isRefreshing: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions): UsePullToRefreshResult {
  const pullRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const tracking = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = pullRef.current;
    if (!el || isRefreshing) return;
    if (el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!tracking.current || isRefreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.5, MAX_PULL));
    } else {
      tracking.current = false;
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!tracking.current) return;
    tracking.current = false;
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.5);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh, threshold]);

  useEffect(() => {
    const el = pullRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullRef, pullDistance, isRefreshing };
}

/**
 * Visual indicator for pull-to-refresh state.
 */
export function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold = 80 }: { pullDistance: number; isRefreshing: boolean; threshold?: number }) {
  if (pullDistance <= 0 && !isRefreshing) return null;
  const ready = pullDistance >= threshold;
  return React.createElement("div", {
    style: {
      height: `${pullDistance}px`,
      transition: "height 0.2s ease-out",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  }, React.createElement("span", {
    className: `text-2xl ${isRefreshing ? "animate-spin" : ""}`,
  }, isRefreshing ? "⟳" : ready ? "↓ Release" : "↓ Pull"));
}
