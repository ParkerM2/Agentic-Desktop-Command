/**
 * Theme Store — Global UI theme state
 *
 * Manages dark/light/system mode, color theme, UI scale, and custom themes.
 * Applies classes, attributes, and CSS custom properties to <html> for CSS to consume.
 */

import { create } from 'zustand';

import { THEME_TOKEN_KEYS } from '@shared/constants/themes';
import type { CustomTheme, ThemeMode } from '@shared/types';

interface ThemeState {
  mode: ThemeMode;
  colorTheme: string;
  uiScale: number;
  customThemes: CustomTheme[];
  layoutGap: number;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: string) => void;
  setUiScale: (scale: number) => void;
  setCustomThemes: (themes: CustomTheme[]) => void;
  setLayoutGap: (gap: number) => void;
}

function resolveEffectiveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolveEffectiveMode(mode));
}

function applyCustomTokens(
  themeId: string,
  customThemes: CustomTheme[],
  mode: ThemeMode,
): void {
  const root = document.documentElement;

  if (themeId === 'default') {
    for (const key of THEME_TOKEN_KEYS) {
      root.style.removeProperty(`--${key}`);
    }
    root.removeAttribute('data-theme');
    return;
  }

  const theme = customThemes.find((t) => t.id === themeId);
  if (theme === undefined) {
    for (const key of THEME_TOKEN_KEYS) {
      root.style.removeProperty(`--${key}`);
    }
    root.removeAttribute('data-theme');
    return;
  }

  const effectiveMode = resolveEffectiveMode(mode);
  const palette = effectiveMode === 'dark' ? theme.dark : theme.light;

  for (const key of THEME_TOKEN_KEYS) {
    root.style.setProperty(`--${key}`, palette[key]);
  }

  root.setAttribute('data-theme', themeId);
}

function applyUiScale(scale: number): void {
  document.documentElement.setAttribute('data-ui-scale', String(scale));
}

function applyLayoutGap(gap: number): void {
  const root = document.documentElement;
  root.style.setProperty('--layout-gap', `${gap / 16}rem`);
  root.style.setProperty('--layout-gap-sm', `${(gap * 0.75) / 16}rem`);
  root.style.setProperty('--layout-gap-lg', `${(gap * 1.5) / 16}rem`);
  root.style.setProperty('--layout-pad-x', `${(gap * 3) / 16}rem`);
  root.style.setProperty('--layout-pad-y', `${(gap * 2) / 16}rem`);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  colorTheme: 'default',
  uiScale: 100,
  customThemes: [],
  layoutGap: 8,
  setMode: (mode) => {
    set({ mode });
    applyMode(mode);
    const { colorTheme, customThemes } = get();
    if (colorTheme !== 'default') {
      applyCustomTokens(colorTheme, customThemes, mode);
    }
  },
  setColorTheme: (colorTheme) => {
    set({ colorTheme });
    const { customThemes, mode } = get();
    applyCustomTokens(colorTheme, customThemes, mode);
  },
  setUiScale: (scale) => {
    const uiScale = Math.max(75, Math.min(150, scale));
    set({ uiScale });
    applyUiScale(uiScale);
  },
  setCustomThemes: (customThemes) => {
    set({ customThemes });
    const { colorTheme, mode } = get();
    if (colorTheme !== 'default') {
      applyCustomTokens(colorTheme, customThemes, mode);
    }
  },
  setLayoutGap: (gap) => {
    const layoutGap = Math.max(0, Math.min(16, gap));
    set({ layoutGap });
    applyLayoutGap(layoutGap);
  },
}));
