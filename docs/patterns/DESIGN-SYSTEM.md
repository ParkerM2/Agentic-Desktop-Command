# Design System — Critical Rules

The design system uses **CSS custom properties** with **Tailwind v4's `@theme` directive** and **`color-mix()`**.

## Architecture

```
postcss.config.mjs          # Enables @tailwindcss/postcss + autoprefixer
src/renderer/styles/globals.css  # ALL theme tokens, base styles, utility classes
src/renderer/shared/stores/theme-store.ts  # Applies mode + colorTheme + uiScale to DOM
src/shared/constants/themes.ts   # COLOR_THEMES array + ColorTheme type
```

## How It Works

1. **Theme variables** defined in `:root`, `.dark`, `[data-theme="name"]`, `[data-theme="name"].dark` blocks
2. **`@theme` block** maps CSS vars to Tailwind tokens: `--color-primary: var(--primary)` etc.
3. **`theme-store.ts`** applies `class="dark"` + `data-theme="ocean"` + `data-ui-scale="110"` to `<html>`
4. Components use standard Tailwind classes: `bg-primary`, `text-foreground`, `border-border`

## NEVER Do This

- **NEVER hardcode RGBA/hex in utility classes or animations.** Use `color-mix()`:
  ```css
  /* WRONG — only works for default theme */
  box-shadow: 0 0 0 4px rgba(214, 216, 118, 0.1);

  /* CORRECT — adapts to any active theme */
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 10%, transparent);
  ```
- **NEVER create `.dark` / `:root` variant selectors** for color differences — `color-mix()` with `var()` adapts automatically
- **NEVER modify the `@theme` block** token mappings — only modify theme variable values in `:root`/`.dark`/`[data-theme]` blocks
- **NEVER remove `postcss.config.mjs`** — Tailwind v4 requires it for PostCSS processing

## Adding a New Color Theme

1. Add `[data-theme="mytheme"]` and `[data-theme="mytheme"].dark` blocks in `globals.css`
2. Add `'mytheme'` to `COLOR_THEMES` array in `src/shared/constants/themes.ts`
3. Add label to `COLOR_THEME_LABELS` in the same file
4. All theme variables MUST be defined (background, foreground, card, primary, secondary, muted, accent, destructive, border, input, ring, sidebar, popover, success, warning, info, error + shadows)

## Raw Color Values

Raw hex/rgb/hsl values are **ONLY** allowed inside theme variable definitions:
```css
/* OK — theme variable definition */
.dark { --primary: #D6D876; }

/* OK — fixed semantic status colors */
.column-queue { border-top-color: #22d3ee; }

/* WRONG — hardcoded in utility class */
.my-hover:hover { background: rgba(214, 216, 118, 0.1); }
```
