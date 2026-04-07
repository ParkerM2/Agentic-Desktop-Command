/**
 * useThemeSync — Syncs persisted settings into the theme store on app startup.
 *
 * Reads the `useSettings()` query result and calls `useThemeStore().hydrate()`
 * whenever settings data loads or changes. Replaces the ThemeHydrator component.
 *
 * Call once in the root layout so the theme store picks up persisted mode,
 * colorTheme, and uiScale before first paint.
 */

import { useEffect } from 'react';

import { useSettings } from '@features/settings';

import { useThemeStore } from '../stores/theme-store';

export function useThemeSync(): void {
  const { data: settings } = useSettings();
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    if (settings) {
      hydrate(settings);
    }
  }, [settings, hydrate]);
}
