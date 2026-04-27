import { useEffect, useRef } from 'react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

/**
 * Manages the full BrowserView lifecycle for the test-suite recorder.
 *
 * - **active=true + url**: CREATEs the BrowserView at the element's bounds,
 *   then keeps bounds in sync via ResizeObserver + window resize.
 * - **active=false**: DESTROYs the BrowserView.
 *
 * This hook owns CREATE / SET-BOUNDS / DESTROY so the parent component
 * only needs to toggle `active` and provide the target `url`.
 */
export function useBrowserViewBounds(active: boolean, url: string) {
  const ref = useRef<HTMLDivElement>(null);
  const created = useRef(false);

  useEffect(() => {
    if (!active || !url || !ref.current) return;
    const el = ref.current;

    const getBounds = () => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };

    // First call: CREATE the view at the correct position
    const bounds = getBounds();
    if (bounds.width > 0 && bounds.height > 0) {
      void ipc(TEST_SUITE['BROWSER-VIEW'].CREATE, { url, bounds });
      created.current = true;
    }

    // Subsequent calls: reposition only
    const post = () => {
      const b = getBounds();
      if (b.width <= 0 || b.height <= 0) return;
      void ipc(TEST_SUITE['BROWSER-VIEW']['SET-BOUNDS'], b);
    };

    const ro = new ResizeObserver(post);
    ro.observe(el);
    window.addEventListener('resize', post);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', post);
      if (created.current) {
        void ipc(TEST_SUITE['BROWSER-VIEW'].DESTROY, {});
        created.current = false;
      }
    };
  }, [active, url]);

  return ref;
}
