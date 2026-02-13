/**
 * Theme Store — Global UI theme state
 *
 * Manages dark/light/system mode, color theme, and UI scale.
 * Applies classes and attributes to <html> for CSS to consume.
 */

import { create } from 'zustand';

import type { ThemeMode } from '@shared/types';

interface ThemeState {
  mode: ThemeMode;
  colorTheme: string;
  uiScale: number;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: string) => void;
  setUiScale: (scale: number) => void;
  hydrate: (settings: { theme?: string; colorTheme?: string; uiScale?: number }) => void;
}

function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    root.classList.add(mode);
  }
}

function applyColorTheme(theme: string): void {
  const root = document.documentElement;
  if (theme === 'default') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

function applyUiScale(scale: number): void {
  document.documentElement.setAttribute('data-ui-scale', String(scale));
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  colorTheme: 'default',
  uiScale: 100,
  setMode: (mode) => {
    set({ mode });
    applyMode(mode);
  },
  setColorTheme: (colorTheme) => {
    set({ colorTheme });
    applyColorTheme(colorTheme);
  },
  setUiScale: (scale) => {
    const uiScale = Math.max(75, Math.min(150, scale));
    set({ uiScale });
    applyUiScale(uiScale);
  },
  hydrate: (settings) => {
    const mode = (settings.theme as ThemeMode | undefined) ?? 'dark';
    const colorTheme = settings.colorTheme ?? 'default';
    const uiScale = Math.max(75, Math.min(150, settings.uiScale ?? 100));
    set({ mode, colorTheme, uiScale });
    applyMode(mode);
    applyColorTheme(colorTheme);
    applyUiScale(uiScale);
  },
}));
