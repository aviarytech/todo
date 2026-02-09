/**
 * useSwipeBack - Detect swipe-right from left edge to navigate back.
 * Mimics iOS back gesture for PWA/web views.
 */
import { useEffect } from "react";

const EDGE_THRESHOLD = 30; // px from left edge to start
const SWIPE_MIN_DISTANCE = 80; // px to trigger back
const SWIPE_MAX_Y = 50; // max vertical movement

export function useSwipeBack() {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (touch.clientX <= EDGE_THRESHOLD) {
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);
      if (dx >= SWIPE_MIN_DISTANCE && dy <= SWIPE_MAX_Y) {
        history.back();
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}
