import { useEffect, useRef } from 'react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

/**
 * Syncs a DOM element's rect to the main-process BrowserView bounds.
 *
 * Observes layout changes via ResizeObserver and window resize, sending
 * SET-BOUNDS to move/size the native BrowserView to overlay the target
 * element. No-ops when inactive or when the element has zero dimensions
 * (the contract requires positive width/height).
 */
export function useBrowserViewBounds(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;

    const post = () => {
      const r = el.getBoundingClientRect();
      const width = Math.round(r.width);
      const height = Math.round(r.height);
      if (width <= 0 || height <= 0) return;
      void ipc(TEST_SUITE['BROWSER-VIEW']['SET-BOUNDS'], {
        x: Math.round(r.left),
        y: Math.round(r.top),
        width,
        height,
      });
    };

    post();
    const ro = new ResizeObserver(post);
    ro.observe(el);
    window.addEventListener('resize', post);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', post);
    };
  }, [active]);

  return ref;
}
