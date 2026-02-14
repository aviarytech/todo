/**
 * Custom hook for touch-based drag and drop on mobile.
 * Provides touch event handlers for reordering list items.
 */

import { useState, useRef, useCallback, type RefObject } from "react";

export interface TouchDragState {
  isDragging: boolean;
  draggedId: string | null;
  dragOverId: string | null;
  touchY: number;
  startY: number;
  offsetY: number;
}

export interface UseTouchDragOptions {
  onReorder: (draggedId: string, targetId: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useTouchDrag({ onReorder, containerRef }: UseTouchDragOptions) {
  const [state, setState] = useState<TouchDragState>({
    isDragging: false,
    draggedId: null,
    dragOverId: null,
    touchY: 0,
    startY: 0,
    offsetY: 0,
  });

  const draggedElementRef = useRef<HTMLElement | null>(null);
  const initialRectRef = useRef<DOMRect | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent, itemId: string, element: HTMLElement) => {
    const touch = e.touches[0];
    const rect = element.getBoundingClientRect();
    
    draggedElementRef.current = element;
    initialRectRef.current = rect;
    
    setState({
      isDragging: true,
      draggedId: itemId,
      dragOverId: null,
      touchY: touch.clientY,
      startY: touch.clientY,
      offsetY: touch.clientY - rect.top,
    });
    
    // Add visual feedback
    element.style.zIndex = '1000';
    element.style.transition = 'none';
    element.style.opacity = '0.9';
    element.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.isDragging || !state.draggedId || !containerRef.current) return;

    // Only prevent default scrolling when actively dragging
    e.preventDefault();

    const touch = e.touches[0];
    const container = containerRef.current;
    const items = Array.from(container.querySelectorAll('[data-item-id]'));
    
    // Find which item we're hovering over
    let dragOverId: string | null = null;
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const itemId = item.getAttribute('data-item-id');
        if (itemId && itemId !== state.draggedId) {
          dragOverId = itemId;
        }
        break;
      }
    }

    setState(prev => ({
      ...prev,
      touchY: touch.clientY,
      dragOverId,
    }));

    // Move the dragged element
    if (draggedElementRef.current && initialRectRef.current) {
      const deltaY = touch.clientY - state.startY;
      draggedElementRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, [state.isDragging, state.draggedId, state.startY, containerRef]);

  const handleTouchEnd = useCallback(() => {
    if (state.draggedId && state.dragOverId) {
      onReorder(state.draggedId, state.dragOverId);
    }

    // Reset visual styles
    if (draggedElementRef.current) {
      draggedElementRef.current.style.zIndex = '';
      draggedElementRef.current.style.transition = '';
      draggedElementRef.current.style.opacity = '';
      draggedElementRef.current.style.boxShadow = '';
      draggedElementRef.current.style.transform = '';
    }

    setState({
      isDragging: false,
      draggedId: null,
      dragOverId: null,
      touchY: 0,
      startY: 0,
      offsetY: 0,
    });

    draggedElementRef.current = null;
    initialRectRef.current = null;
  }, [state.draggedId, state.dragOverId, onReorder]);

  return {
    state,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
