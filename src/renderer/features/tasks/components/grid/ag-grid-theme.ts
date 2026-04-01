/**
 * AG-Grid theme configuration using the v35 Theming API.
 *
 * Instead of CSS class-based theming (.ag-theme-quartz + manual CSS overrides),
 * we use `themeQuartz.withPart(...).withParams({...})` which:
 *   - Injects all required CSS automatically (no manual ag-grid.css imports)
 *   - Sets colors via CSS custom properties from our design system
 *   - Handles dark/light mode dynamically via colorSchemeDark / colorSchemeLight
 *   - Eliminates all !important hacks and specificity battles with Tailwind v4
 *
 * @see https://www.ag-grid.com/react-data-grid/theming-colors/
 * @see https://www.ag-grid.com/react-data-grid/themes/
 */

import type { Theme } from 'ag-grid-community';
import { colorSchemeDark, colorSchemeLight, themeQuartz } from 'ag-grid-community';

/**
 * Creates an AG-Grid theme that respects the app's light/dark mode.
 * All colors use CSS custom properties that adapt automatically
 * when the user switches color themes.
 */
export function createAdcGridTheme(isDark: boolean): Theme {
  return themeQuartz
    .withPart(isDark ? colorSchemeDark : colorSchemeLight)
    .withParams({
      // ── Core colors ──
      backgroundColor: 'var(--card)',
      foregroundColor: 'var(--foreground)',
      dataBackgroundColor: 'var(--card)',
      borderColor: 'var(--border)',
      accentColor: 'var(--primary)',
      browserColorScheme: isDark ? 'dark' : 'light',

      // ── Chrome (header, panels, menus) ──
      chromeBackgroundColor: 'var(--muted)',
      headerBackgroundColor: 'var(--muted)',
      headerTextColor: 'var(--foreground)',
      headerCellHoverBackgroundColor: 'color-mix(in srgb, var(--accent) 70%, transparent)',

      // ── Rows ──
      oddRowBackgroundColor: 'color-mix(in srgb, var(--muted) 30%, transparent)',
      rowHoverColor: 'color-mix(in srgb, var(--accent) 50%, transparent)',
      selectedRowBackgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)',
      rangeSelectionBackgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',

      // ── Panels / Menus / Overlays ──
      menuBackgroundColor: 'var(--popover)',
      panelBackgroundColor: 'var(--card)',
      modalOverlayBackgroundColor: 'color-mix(in srgb, var(--background) 80%, transparent)',
      tooltipBackgroundColor: 'var(--popover)',

      // ── Controls ──
      toggleButtonOnBackgroundColor: 'var(--primary)',

      // ── Text ──
      subtleTextColor: 'var(--muted-foreground)',

      // ── Sizing & Typography ──
      fontSize: 13,
      spacing: 6,
      headerHeight: 40,
      rowHeight: 44,
      iconSize: 14,
    });
}
