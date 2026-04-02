# ADC Design System Skill

ADC uses **CSS custom properties** + **Tailwind v4 `@theme` directive** + **`color-mix()`** for a multi-theme, light/dark design system. Not shadcn defaults. Not Next.js patterns.

## Architecture

```
src/renderer/styles/globals.css          # ALL theme tokens, animations, utility classes
src/shared/constants/themes.ts           # THEME_TOKEN_KEYS (33 tokens), COLOR_THEMES, labels
src/renderer/shared/stores/theme-store.ts # Applies mode + colorTheme + uiScale to <html>
src/renderer/shared/components/ui/      # 33 Radix-based primitives (import via @ui/*)
src/renderer/shared/lib/utils.ts        # cn() utility
```

## How Theme Switching Works

1. `theme-store.ts` applies `class="dark"` + `data-theme="<id>"` + `data-ui-scale="<n>"` to `<html>`
2. `globals.css` has `:root` (light defaults), `.dark` (dark defaults), `[data-theme="name"]` (custom)
3. `@theme` block maps CSS vars to Tailwind tokens: `--color-primary: var(--primary)`
4. Components use standard Tailwind: `bg-primary`, `text-foreground`, `border-border`

## The 33 Token Keys (from `THEME_TOKEN_KEYS`)

`background`, `foreground`, `card`, `card-foreground`, `primary`, `primary-foreground`,
`secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`,
`destructive`, `destructive-foreground`, `border`, `input`, `ring`, `sidebar`, `sidebar-foreground`,
`popover`, `popover-foreground`, `success`, `success-foreground`, `warning`, `warning-foreground`,
`info`, `info-foreground`, `error`, `error-light`, `success-light`, `warning-light`, `info-light`,
`shadow-focus`

## NEVER Hardcode Colors in Utilities — Use `color-mix()`

```css
/* WRONG — breaks on any non-default theme */
box-shadow: 0 0 0 4px rgba(214, 216, 118, 0.1);

/* CORRECT — adapts to any active theme */
box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 10%, transparent);
```

Raw hex is only allowed **inside theme variable definitions** in `globals.css`.

## The `cn()` Utility

```typescript
import { cn } from '@renderer/shared/lib/utils';

<div className={cn('base-class', isActive && 'active-class', variant === 'ghost' && 'text-muted-foreground')} />
```

## Available UI Primitives (`@ui/*`)

Import path alias: `@ui/*` → `src/renderer/shared/components/ui/*`

| Primitive | Import |
|-----------|--------|
| alert-dialog | `@ui/alert-dialog` |
| badge | `@ui/badge` |
| breadcrumb | `@ui/breadcrumb` |
| button | `@ui/button` |
| card | `@ui/card` |
| checkbox | `@ui/checkbox` |
| collapsible | `@ui/collapsible` |
| container | `@ui/container` |
| dialog | `@ui/dialog` |
| dropdown-menu | `@ui/dropdown-menu` |
| empty-state | `@ui/empty-state` |
| flex | `@ui/flex` |
| form | `@ui/form` |
| grid | `@ui/grid` |
| input | `@ui/input` |
| label | `@ui/label` |
| page-layout | `@ui/page-layout` |
| popover | `@ui/popover` |
| progress | `@ui/progress` |
| scroll-area | `@ui/scroll-area` |
| select | `@ui/select` |
| separator | `@ui/separator` |
| sidebar | `@ui/sidebar` |
| skeleton | `@ui/skeleton` |
| slider | `@ui/slider` |
| spinner | `@ui/spinner` |
| stack | `@ui/stack` |
| switch | `@ui/switch` |
| tabs | `@ui/tabs` |
| textarea | `@ui/textarea` |
| toast | `@ui/toast` |
| tooltip | `@ui/tooltip` |
| typography | `@ui/typography` |

## Adding a New Color Theme

1. Add blocks in `src/renderer/styles/globals.css`:
```css
[data-theme="mytheme"] {
  --background: #...; --foreground: #...; --primary: #...;
  /* ALL 33 tokens must be defined */
}
[data-theme="mytheme"].dark {
  --background: #...; /* dark variants */
}
```
2. Add to `COLOR_THEMES` in `src/shared/constants/themes.ts`:
```typescript
export const COLOR_THEMES = ['default', 'mytheme'] as const;
```
3. Add label to `COLOR_THEME_LABELS`:
```typescript
export const COLOR_THEME_LABELS: Record<ColorTheme, string> = {
  default: 'Default',
  mytheme: 'My Theme',
};
```

Custom themes defined programmatically (user-created) are stored via `useThemeStore` and injected as inline CSS custom properties on `<html>` — they don't need `globals.css` blocks.

## Adding a New UI Primitive

1. Create `src/renderer/shared/components/ui/<name>.tsx` wrapping the Radix primitive
2. Use `cn()` for conditional classes
3. Use `var(--token)` references or Tailwind semantic classes (`bg-card`, `text-muted-foreground`)
4. Never hardcode hex/rgba in the component — use `color-mix()` for opacity variants

## Key Rules

- **NEVER** modify the `@theme` block token mappings in `globals.css` — only modify theme variable values
- **NEVER** create `.dark` / `:root` variant selectors for color differences — use `color-mix()` with `var()`
- **NEVER** remove `postcss.config.mjs` — Tailwind v4 requires it
- **NEVER** add hex/rgba in utility classes or animations — `color-mix(in srgb, var(--token) X%, transparent)`
- Fixed semantic status colors (column status indicators) may use raw hex — this is the only exception
- UI scale range: 75–150 (clamped by store)
