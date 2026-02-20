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
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: string) => void;
  setUiScale: (scale: number) => void;
  setCustomThemes: (themes: CustomTheme[]) => void;
  hydrate: (settings: { theme?: string; colorTheme?: string; uiScale?: number }) => void;
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
    // Clear all custom CSS properties and remove data-theme attribute
    for (const key of THEME_TOKEN_KEYS) {
      root.style.removeProperty(`--${key}`);
    }
    root.removeAttribute('data-theme');
    return;
  }

  const theme = customThemes.find((t) => t.id === themeId);
  if (theme === undefined) {
    // Unknown theme ID — fall back to default behavior
    for (const key of THEME_TOKEN_KEYS) {
      root.style.removeProperty(`--${key}`);
    }
    root.removeAttribute('data-theme');
    return;
  }

  // Pick the correct palette based on effective mode
  const effectiveMode = resolveEffectiveMode(mode);
  const palette = effectiveMode === 'dark' ? theme.dark : theme.light;

  // Inject all token values as CSS custom properties
  for (const key of THEME_TOKEN_KEYS) {
    root.style.setProperty(`--${key}`, palette[key]);
  }

  // Set data-theme to signal custom theme is active
  root.setAttribute('data-theme', themeId);
}

function applyUiScale(scale: number): void {
  document.documentElement.setAttribute('data-ui-scale', String(scale));
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  colorTheme: 'default',
  uiScale: 100,
  customThemes: [],
  setMode: (mode) => {
    set({ mode });
    applyMode(mode);
    // Re-apply custom tokens if a custom theme is active
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
    // Re-apply current theme in case the active theme's tokens changed
    const { colorTheme, mode } = get();
    if (colorTheme !== 'default') {
      applyCustomTokens(colorTheme, customThemes, mode);
    }
  },
  hydrate: (settings) => {
    const mode = (settings.theme as ThemeMode | undefined) ?? 'dark';
    const colorTheme = settings.colorTheme ?? 'default';
    const uiScale = Math.max(75, Math.min(150, settings.uiScale ?? 100));
    set({ mode, colorTheme, uiScale });
    applyMode(mode);
    applyCustomTokens(colorTheme, get().customThemes, mode);
    applyUiScale(uiScale);
  },
}));
