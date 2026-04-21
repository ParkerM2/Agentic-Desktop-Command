/**
 * useDarkMode — resolves the current theme mode to a boolean dark flag.
 *
 * Consumes the theme store and handles the 'system' mode via matchMedia.
 */

import { useMemo } from 'react';

import { useThemeStore } from '@renderer/shared/stores/theme-store';

export function useDarkMode(): boolean {
  const mode = useThemeStore((s) => s.mode);
  return useMemo(() => {
    if (mode === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return mode === 'dark';
  }, [mode]);
}
