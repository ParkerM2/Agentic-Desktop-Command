/**
 * LayoutHydrator — Restores persisted layout state on app startup.
 *
 * Renders nothing. Place once in the root layout so the layout store
 * picks up persisted sidebar state, project tabs, and active project
 * before first paint.
 */

import { useEffect } from 'react';

import { ipc } from '@renderer/shared/lib/ipc';

import { useLayoutStore } from './layout-store';

export function LayoutHydrator() {
  const hydrate = useLayoutStore((s) => s.hydrate);

  useEffect(() => {
    void (async () => {
      try {
        const layout = await ipc('settings.getLayout', {});
        hydrate(layout);
      } catch {
        // Settings unavailable — keep defaults
      }
    })();
  }, [hydrate]);

  return null;
}
