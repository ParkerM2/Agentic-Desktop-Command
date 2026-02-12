/**
 * Theme Store — Global UI theme state
 *
 * Manages dark/light/system mode. Persisted via settings IPC.
 */

import { create } from 'zustand';

import type { ThemeMode } from '@shared/types';

interface ThemeState {
  mode: ThemeMode;
  colorTheme: string;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  colorTheme: 'default',
  setMode: (mode) => {
    set({ mode });
    applyThemeClass(mode);
  },
  setColorTheme: (colorTheme) => set({ colorTheme }),
}));

/** Apply the theme class to <html> */
function applyThemeClass(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    root.classList.add(mode);
  }
}
