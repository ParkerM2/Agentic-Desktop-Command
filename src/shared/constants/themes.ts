/** Available color themes — maps to [data-theme] CSS selectors */
export const COLOR_THEMES = ['default', 'dusk', 'lime', 'ocean', 'retro', 'neo', 'forest'] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

/** Human-readable labels for color themes */
export const COLOR_THEME_LABELS: Record<ColorTheme, string> = {
  default: 'Oscura',
  dusk: 'Dusk',
  lime: 'Lime',
  ocean: 'Ocean',
  retro: 'Retro',
  neo: 'Neo',
  forest: 'Forest',
} as const;
