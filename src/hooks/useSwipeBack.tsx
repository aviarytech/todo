/**
 * Hook for swipe-right-from-left-edge to navigate back (like native iOS).
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useSwipeBack() {
  const navigate = useNavigate();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger from left edge (within 30px)
      if (touch.clientX < 30) {
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);

      // Swipe must be mostly horizontal (>80px) and not too vertical
      if (deltaX > 80 && deltaY < 100) {
        navigate(-1);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);
}
