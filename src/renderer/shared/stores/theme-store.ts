/**
 * Theme Store — Global UI theme state
 *
 * Manages dark/light/system mode, color theme, UI scale, and custom themes.
 * Applies classes, attributes, and CSS custom properties to <html> for CSS to consume.
 */

import { create } from 'zustand';

import { THEME_TOKEN_KEYS } from '@shared/constants/themes';
import type { CustomTheme, ThemeMode } from '@shared/types';

export type IconButtonShape = 'rounded' | 'square' | 'pill';

interface ThemeState {
  mode: ThemeMode;
  colorTheme: string;
  uiScale: number;
  customThemes: CustomTheme[];
  layoutGap: number;
  iconButtonShape: IconButtonShape;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: string) => void;
  setUiScale: (scale: number) => void;
  setCustomThemes: (themes: CustomTheme[]) => void;
  setLayoutGap: (gap: number) => void;
  setIconButtonShape: (shape: IconButtonShape) => void;
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

function applyLayoutGap(gap: number): void {
  const root = document.documentElement;
  root.style.setProperty('--layout-gap', `${gap / 16}rem`);
  root.style.setProperty('--layout-gap-sm', `${(gap * 0.75) / 16}rem`);
  root.style.setProperty('--layout-gap-lg', `${(gap * 1.5) / 16}rem`);
  root.style.setProperty('--layout-pad-x', `${(gap * 3) / 16}rem`);
  root.style.setProperty('--layout-pad-y', `${(gap * 2) / 16}rem`);
}

const BUTTON_SHAPE_RADIUS: Record<IconButtonShape, string> = {
  rounded: '0.375rem',
  square: '0rem',
  pill: '9999px',
};

const ICON_BUTTON_SHAPE_RADIUS: Record<IconButtonShape, string> = {
  rounded: '0.125rem',
  square: '0rem',
  pill: '9999px',
};

function applyIconButtonShape(shape: IconButtonShape): void {
  const root = document.documentElement;
  root.style.setProperty('--btn-radius', BUTTON_SHAPE_RADIUS[shape]);
  root.style.setProperty('--btn-icon-radius', ICON_BUTTON_SHAPE_RADIUS[shape]);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  colorTheme: 'default',
  uiScale: 100,
  customThemes: [],
  layoutGap: 8,
  iconButtonShape: 'rounded',
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
  setLayoutGap: (gap) => {
    const layoutGap = Math.max(0, Math.min(16, gap));
    set({ layoutGap });
    applyLayoutGap(layoutGap);
  },
  setIconButtonShape: (iconButtonShape) => {
    set({ iconButtonShape });
    applyIconButtonShape(iconButtonShape);
  },
}));
