# Layout Preset Simplification

**Date:** 2026-04-21  
**Branch:** `feature/agent-project-display-cleanup`  
**Status:** Approved

## Problem

The Display settings tab exposes too many individual layout knobs (16 sidebar variants, 8 toolbar styles, 4 content layouts, 3 icon shapes). The icon shape selector was never meant to be user-facing — icon buttons should adapt to their parent context. The toolbar's floating mode still renders square hover states on child icon buttons, contradicting the rounded container.

## Solution

Replace all individual layout selectors with a single **Layout Preset** dropdown containing two bundled options. Remove the icon shape selector entirely.

### Layout Presets

| Preset | Sidebar | Content | Toolbar |
|--------|---------|---------|---------|
| **Default** | `sidebar-07` (icon collapse, flat groups, tooltips) | `flush` | `default` (h-10, solid bg, border) |
| **Floating** | `sidebar-04` (floating variant, collapsible groups) | `bordered` (rounded-lg border, inner spacing) | `floating` (h-9, rounded-lg, shadow-sm, 90% bg) |

### Icon Button Shape

Remove as a user setting. Hardcode `rounded` as the default. The floating toolbar's `rounded-lg` class should cascade rounded hover states to child icon buttons — this is a CSS fix in `TopBar.tsx`, not a setting.

## Files Changed

### Remove code

1. **`src/shared/types/layout.ts`** — Remove all sidebar variants except `sidebar-04` and `sidebar-07`. Remove all toolbar styles except `default` and `floating`. Remove all content layouts except `flush` and `bordered`. Add `LayoutPreset` type (`'default' | 'floating'`) and `LAYOUT_PRESETS` constant mapping each preset to its `{ sidebar, toolbar, content }` values.

2. **`src/shared/types/settings.ts`** — Remove `sidebarLayout`, `toolbarStyle`, `contentLayout`, `iconButtonShape` fields from `AppSettings`. Add `layoutPreset?: LayoutPreset`.

3. **`src/shared/ipc/settings/schemas.ts`** — Update Zod schemas: remove `iconButtonShape`, `sidebarLayout`, `toolbarStyle`, `contentLayout` fields. Add `layoutPreset`.

4. **`src/renderer/shared/stores/theme-store.ts`** — Remove `IconButtonShape` type, `iconButtonShape` state, `setIconButtonShape` action, `BUTTON_SHAPE_RADIUS`, `ICON_BUTTON_SHAPE_RADIUS` maps, and `applyIconButtonShape` function. Hardcode `--btn-radius: 0.375rem` and `--btn-icon-radius: 0.125rem` in `globals.css` (static, not dynamic).

5. **`src/renderer/shared/stores/layout-store.ts`** — Replace `sidebarLayout`, `toolbarStyle`, `contentLayout` with single `layoutPreset: LayoutPreset` field. Add `setLayoutPreset(id)` that sets the preset and derives the three underlying values. Keep `sidebarLayout`, `toolbarStyle`, `contentLayout` as **derived getters** (computed from preset) so `TopBar.tsx`, `ContentAreaContainer.tsx`, and `AppSidebar.tsx` continue to work without changes to their read paths.

6. **`src/renderer/features/settings/components/LayoutSection.tsx`** — Gut the 2x2 grid. New layout: single bordered container with two items side by side — Layout Preset dropdown (left) and Color Theme dropdown + customize button (right). Keep the SVG preview below. Remove all icon shape UI. Remove `LAYOUT_PREVIEWS` for unused sidebar variants (keep `sidebar-04` and `sidebar-07` entries only).

7. **`src/renderer/features/settings/api/useSettings.ts`** — Update hydration to read `layoutPreset` instead of individual fields. Update mutation to persist `layoutPreset`.

8. **`src/main/features/settings/settings-service.ts`** — Update `getLayout()` and `saveLayout()` for preset-based persistence.

9. **`src/main/features/settings/settings-defaults.ts`** — Update default to `layoutPreset: 'default'`, remove `iconButtonShape`.

10. **`src/renderer/app/layouts/TopBar.tsx`** — Remove unused toolbar style classes (keep `default` and `floating` only). Fix floating toolbar's icon button hover: add `[&_button]:rounded-md` or similar scoped class so icon buttons inside the floating toolbar get rounded hover states.

11. **`src/renderer/app/layouts/ContentAreaContainer.tsx`** — Remove unused content layout styles (keep `flush` and `bordered` only).

12. **`src/renderer/app/layouts/sidebar-layouts/layout-configs.ts`** — Remove unused layout configs (keep `sidebar-04` and `sidebar-07` only).

### No changes needed

- **`AppSidebar.tsx`** — Reads `sidebarLayout` from layout store, which remains as a derived value.
- **`globals.css`** — Make `--btn-radius` and `--btn-icon-radius` static values instead of dynamic.

## Migration

Existing users with persisted `sidebarLayout`/`toolbarStyle`/`contentLayout` values: on hydration, map their combination to the nearest preset. If `toolbarStyle === 'floating'` or `sidebarLayout === 'sidebar-04'`, map to `floating`. Otherwise map to `default`.

`layoutGap` and `uiScale` are unaffected — they remain independent settings.

## Settings UI Layout

```
┌──────────────────────────────────────────────┐
│  Layout (preset)     │  Color Theme + [edit]  │
├──────────────────────┴───────────────────────┤
│           Unified SVG Preview                 │
│      (sidebar | toolbar | content tints)      │
│           + color legend below                │
└──────────────────────────────────────────────┘
```

Two dropdowns side by side in a bordered container, SVG preview spanning full width below them.
