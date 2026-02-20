/**
 * css-parser — Parse tweakcn/shadcn CSS into ThemeTokens
 *
 * Supports three color formats:
 * - Hex: #ffffff
 * - Bare HSL (Tailwind v3): 0 0% 100%
 * - OKLCH (Tailwind v4): oklch(1 0 0)
 */

import { DEFAULT_DARK_TOKENS, DEFAULT_LIGHT_TOKENS, THEME_TOKEN_KEYS } from '@shared/constants/themes';
import type { ThemeTokens } from '@shared/types';

/** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to hex string */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const chroma = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = chroma;
    g = x;
  } else if (h < 120) {
    r = x;
    g = chroma;
  } else if (h < 180) {
    g = chroma;
    b = x;
  } else if (h < 240) {
    g = x;
    b = chroma;
  } else if (h < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const toHexComponent = (c: number): string => {
    const hex = Math.round((c + m) * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHexComponent(r)}${toHexComponent(g)}${toHexComponent(b)}`;
}

/** Approximate OKLCH to hex (simplified conversion) */
function oklchToHex(l: number, c: number, h: number): string {
  // Approximate OKLCH -> sRGB via simplified model
  // This is a reasonable approximation for theme editing purposes
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const bVal = c * Math.sin(hRad);

  // OKLAB to linear sRGB (approximate)
  const lCubed = (l + 0.3963377774 * a + 0.2158037573 * bVal) ** 3;
  const mCubed = (l - 0.1055613458 * a - 0.0638541728 * bVal) ** 3;
  const sCubed = (l - 0.0894841775 * a - 1.291485548 * bVal) ** 3;

  const rLin = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const gLin = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const bLin = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  // Linear to sRGB gamma
  const gammaCorrect = (v: number): number => {
    const clamped = Math.max(0, Math.min(1, v));
    return clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  };

  const r = Math.round(gammaCorrect(rLin) * 255);
  const g = Math.round(gammaCorrect(gLin) * 255);
  const b = Math.round(gammaCorrect(bLin) * 255);

  const toHex = (n: number): string => {
    const hex = Math.max(0, Math.min(255, n)).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Parse a single CSS value into a hex color or passthrough for non-color values */
function parseCssValue(value: string): string {
  const trimmed = value.trim();

  // Already hex
  if (trimmed.startsWith('#')) {
    // Expand shorthand hex (#abc -> #aabbcc)
    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return trimmed;
  }

  // OKLCH format: oklch(0.95 0.02 250)
  const oklchMatch = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i.exec(trimmed);
  if (oklchMatch) {
    const lightness = Number.parseFloat(oklchMatch[1]);
    const chroma = Number.parseFloat(oklchMatch[2]);
    const hue = Number.parseFloat(oklchMatch[3]);
    return oklchToHex(lightness, chroma, hue);
  }

  // Bare HSL (Tailwind v3): "0 0% 100%" or "240 5.9% 10%"
  const hslMatch = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(trimmed);
  if (hslMatch) {
    const hue = Number.parseFloat(hslMatch[1]);
    const sat = Number.parseFloat(hslMatch[2]);
    const light = Number.parseFloat(hslMatch[3]);
    return hslToHex(hue, sat, light);
  }

  // Passthrough for non-color values (e.g., shadow-focus CSS shadow strings)
  return trimmed;
}

/** Normalize a CSS variable name: strip --color- or -- prefix, return bare token key */
function normalizeTokenKey(rawKey: string): string {
  let key = rawKey.trim();
  // Strip -- prefix
  if (key.startsWith('--')) {
    key = key.slice(2);
  }
  // Strip color- prefix (Tailwind v4 uses --color-background, we use --background)
  if (key.startsWith('color-')) {
    key = key.slice(6);
  }
  return key;
}

/** Check if a key is a valid theme token */
function isValidTokenKey(key: string): key is keyof ThemeTokens {
  return (THEME_TOKEN_KEYS as readonly string[]).includes(key);
}

/** Extract CSS variable declarations from a block string */
function parseBlock(blockContent: string): Partial<ThemeTokens> {
  const result: Partial<ThemeTokens> = {};
  // Match lines like: --background: #ffffff; or --color-primary: oklch(0.9 0.1 150);
  const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match = varRegex.exec(blockContent);

  while (match !== null) {
    const rawKey = match[1];
    const rawValue = match[2];
    const key = normalizeTokenKey(rawKey);

    if (isValidTokenKey(key)) {
      const parsedValue = parseCssValue(rawValue);
      result[key] = parsedValue;
    }

    match = varRegex.exec(blockContent);
  }

  return result;
}

/** Extract block content between balanced braces */
function extractBlockContent(css: string, startIdx: number): string {
  let depth = 0;
  let blockStart = -1;

  for (let i = startIdx; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) {
        blockStart = i + 1;
      }
      depth++;
    } else if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        return css.slice(blockStart, i);
      }
    }
  }

  return '';
}

/**
 * Parse CSS text into light and dark ThemeTokens.
 *
 * Recognizes `:root { ... }` as light tokens and `.dark { ... }` as dark tokens.
 * Missing tokens are filled from defaults.
 */
export function parseCssToTokens(css: string): {
  light: Partial<ThemeTokens>;
  dark: Partial<ThemeTokens>;
} {
  const light: Partial<ThemeTokens> = {};
  const dark: Partial<ThemeTokens> = {};

  // Find :root blocks
  const rootRegex = /:root/g;
  let rootMatch = rootRegex.exec(css);
  while (rootMatch !== null) {
    const blockContent = extractBlockContent(css, rootMatch.index);
    Object.assign(light, parseBlock(blockContent));
    rootMatch = rootRegex.exec(css);
  }

  // Find .dark blocks
  const darkRegex = /\.dark/g;
  let darkMatch = darkRegex.exec(css);
  while (darkMatch !== null) {
    const blockContent = extractBlockContent(css, darkMatch.index);
    Object.assign(dark, parseBlock(blockContent));
    darkMatch = darkRegex.exec(css);
  }

  // Fill missing tokens with defaults
  for (const key of THEME_TOKEN_KEYS) {
    light[key] ??= DEFAULT_LIGHT_TOKENS[key];
    dark[key] ??= DEFAULT_DARK_TOKENS[key];
  }

  return { light, dark };
}
