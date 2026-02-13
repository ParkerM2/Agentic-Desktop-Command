/**
 * ThemeHydrator — Syncs persisted settings into the theme store on app startup.
 *
 * Renders nothing. Place once in the root layout so the theme store
 * picks up persisted mode, colorTheme, and uiScale before first paint.
 */

import { useEffect } from 'react';

import { useSettings } from '@features/settings';

import { useThemeStore } from './theme-store';

export function ThemeHydrator() {
  const { data: settings } = useSettings();
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    if (settings) {
      hydrate(settings);
    }
  }, [settings, hydrate]);

  return null;
}
