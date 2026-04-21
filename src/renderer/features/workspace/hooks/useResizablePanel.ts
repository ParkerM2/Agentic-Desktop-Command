/**
 * useResizablePanel — Drag-to-resize logic for card panels.
 *
 * Extracts the ~70 lines of drag logic from useTeamLeadPanel into a
 * reusable hook. Supports both top-edge and bottom-edge drag handles
 * with configurable default, min height, and edge detection zone.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResizablePanelOpts {
  defaultHeight?: number;
  minHeight?: number;
  edgeZone?: number;
}

export function useResizablePanel(opts: UseResizablePanelOpts = {}) {
  const { defaultHeight = 192, minHeight = 64, edgeZone = 6 } = opts;

  const [height, setHeight] = useState(defaultHeight);
  const isDragging = useRef(false);
  const dragFromTop = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(defaultHeight);
  const maxHeight = useRef(Infinity);
  const cardRef = useRef<HTMLDivElement>(null);

  const getEdge = useCallback(
    (e: React.MouseEvent): 'top' | 'bottom' | null => {
      const card = cardRef.current;
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      if (e.clientY - rect.top <= edgeZone) return 'top';
      if (rect.bottom - e.clientY <= edgeZone) return 'bottom';
      return null;
    },
    [edgeZone],
  );

  const computeMaxHeight = useCallback(() => {
    const card = cardRef.current;
    if (!card) return Infinity;
    const scrollParent = card.closest('[class*="overflow-y"]');
    if (!scrollParent || !(scrollParent instanceof HTMLElement)) return Infinity;
    const containerHeight = scrollParent.clientHeight;
    const siblingCards = scrollParent.querySelectorAll(':scope > div > div');
    let othersHeight = 0;
    for (const sibling of siblingCards) {
      if (sibling !== card) {
        othersHeight += (sibling as HTMLElement).offsetHeight;
      }
    }
    const gaps = Math.max(0, siblingCards.length - 1) * 12;
    const padding = 24;
    const cardChrome = card.offsetHeight - height;
    return Math.max(minHeight, containerHeight - othersHeight - gaps - padding - cardChrome);
  }, [height, minHeight]);

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const rawDelta = e.clientY - startY.current;
      const delta = dragFromTop.current ? -rawDelta : rawDelta;
      const next = Math.min(maxHeight.current, Math.max(minHeight, startHeight.current + delta));
      setHeight(next);
    },
    [minHeight],
  );

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const edge = getEdge(e);
      if (!edge) return;
      e.preventDefault();
      isDragging.current = true;
      dragFromTop.current = edge === 'top';
      startY.current = e.clientY;
      startHeight.current = height;
      maxHeight.current = computeMaxHeight();
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    },
    [height, handleDragMove, handleDragEnd, getEdge, computeMaxHeight],
  );

  const handleCardMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const card = cardRef.current;
      if (!card || isDragging.current) return;
      card.style.cursor = getEdge(e) ? 'row-resize' : '';
    },
    [getEdge],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  return { height, cardRef, handleCardMouseDown, handleCardMouseMove };
}
