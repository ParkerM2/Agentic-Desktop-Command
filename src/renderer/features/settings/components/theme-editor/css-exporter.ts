/**
 * css-exporter — Generate CSS from ThemeTokens
 *
 * Outputs :root { ... } and .dark { ... } blocks with all 33 token variables.
 */

import { THEME_TOKEN_KEYS } from '@shared/constants/themes';
import type { ThemeTokens } from '@shared/types';

/**
 * Generate CSS string from light and dark ThemeTokens.
 *
 * Output format:
 * ```css
 * :root {
 *   --background: #f2f2ed;
 *   ...
 * }
 * .dark {
 *   --background: #0b0b0f;
 *   ...
 * }
 * ```
 */
export function exportTokensToCss(light: ThemeTokens, dark: ThemeTokens): string {
  const lightLines = THEME_TOKEN_KEYS.map((key) => `  --${key}: ${light[key]};`);
  const darkLines = THEME_TOKEN_KEYS.map((key) => `  --${key}: ${dark[key]};`);

  return `:root {\n${lightLines.join('\n')}\n}\n\n.dark {\n${darkLines.join('\n')}\n}\n`;
}

/** Copy CSS text to clipboard and return whether it succeeded */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
