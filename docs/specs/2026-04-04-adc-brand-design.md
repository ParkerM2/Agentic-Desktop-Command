# ADC Brand Design Specification
**Version:** 1.0  
**Date:** 2026-04-04  
**Status:** Approved — ready for implementation

---

## 1. Brand Identity

### Name & Positioning
- **Full name:** Agentic Desktop Command
- **Short name / identifier:** ADC
- **Tagline:** One command center. Every agent. Every project.

### Concept
ADC is a single hub from which one user orchestrates AI agent teams across multiple codebases and projects — while also accessing personal productivity features (fitness tracking, notes, tasks, personal AI assistant). The brand communicates *command authority* and *precision* without coldness. It is a power tool with a distinctive character.

### Competitive Position
Every major developer tool (Zed, Cursor, Linear, Raycast, Vercel, opencode) uses a geometric sans-serif wordmark and a geometric logomark. None use script/calligraphic lettermarks. ADC's script monogram is a genuine open lane — maximum differentiation in a homogeneous category.

Anthropic/Claude's brand is warm (terra cotta `#D97757`, Copernicus serif typeface). ADC's cool teal `#2DD4BF` signals "precision power tooling built on Claude, not Claude itself."

---

## 2. Logo & Mark

### 2.1 The Monogram Mark
**Letterform:** "ADC" in Pinyon Script (Google Fonts, OFL licensed) — a Spencerian-style script with high-contrast strokes (thick downstrokes, hairline crossstrokes), systematic optical consistency, and dramatic swash capitals. This is precision engineering in letterform, not casual handwriting.

**Production approach:** Use `opentype.js` to load `PinyonScript-Regular.ttf` and convert the "ADC" glyphs to pure SVG `<path>` geometry. The final mark has zero font runtime dependency — it is pure vector geometry.

**The flourish:** A single thin curved stroke (teal `#2DD4BF`) beneath the connected script — like a signature underline. 3px stroke weight, 60% the width of the script text, centered. This is the only color moment in the entire mark.

### 2.2 The Badge
The mark lives in a rounded-square (squircle) badge:
- **Shape:** Rectangle with `border-radius: 22%` of the shorter dimension (≈44px on a 200px badge)
- **Fill:** `#141416` (Void — one step lighter than Abyss to create depth against app backgrounds)
- **Border:** 1px inside stroke, `#2A2A2E` (Rim)
- **Mark position:** Script "ADC" centered with ~16% padding on all sides
- **Flourish position:** 8px below the script baseline, centered

### 2.3 Tiered System

| Tier | Size Range | Content | Usage |
|------|-----------|---------|-------|
| **Full mark** | 512px–1024px | Script "ADC" + teal flourish | App icon (large), website, marketing, About screen |
| **Standard mark** | 64px–256px | Script "ADC" + teal flourish | App icon (medium), taskbar, dock |
| **Reduced mark** | 32px–48px | Script "A" + teal flourish dot | Taskbar, smaller contexts |
| **Micro mark** | 16px | Geometric "A" silhouette | System tray icon, favicon |

The micro mark (16px) uses a simplified geometric capital "A" derived from the script — not the full script rendering, which loses all detail at that size.

### 2.4 Wordmark
Used alongside the mark on website headers, the About screen, and marketing:
- **"ADC"** — Geist 600 (SemiBold), 64px, letter-spacing `-0.015em`, color Snow `#F0F0F5`
- **"AGENTIC DESKTOP COMMAND"** — Geist 400 (Regular), 12px, letter-spacing `0.3em`, color Ash `#6B6B72`
- The wordmark **never replaces** the badge mark — it always accompanies it

---

## 3. Color System

### 3.1 Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Background | **Abyss** | `#0D0D0F` | App background, page fill |
| Surface | **Void** | `#141416` | Cards, panels, sidebars, icon badge |
| Elevated | **Lift** | `#1C1C1F` | Modals, dropdowns, hover states |
| Border | **Rim** | `#2A2A2E` | Dividers, input borders, badge stroke |
| Muted text | **Ash** | `#6B6B72` | Placeholders, secondary labels, disabled |
| Body text | **Fog** | `#C4C4CC` | Primary readable text, descriptions |
| Heading text | **Snow** | `#F0F0F5` | Headings, nav labels, mark fill |
| Accent | **Command** | `#2DD4BF` | Active states, status, logo flourish, CTAs |
| Accent dim | **Command Dim** | `#1A8A7A` | Pressed/hover state of teal elements |

### 3.2 Usage Rules
- **Command** (`#2DD4BF`) is used *only* as a functional signal: active nav item, running agent indicator, selected state, online status, the logo flourish, primary CTA buttons. Never decorative.
- No other accent colors. Additional state differentiation uses opacity of Snow/Ash.
- The background stack (Abyss → Void → Lift) creates depth with no color.
- Status colors (success/error/warning) use muted semantic variants derived from the neutral base — not saturated greens/reds that compete with Command teal.

### 3.3 Tailwind v4 Token Generation
Use **tweakcn** (https://tweakcn.com) to generate the bespoke dark theme. Export as Tailwind v4 `@theme {}` CSS variable format. The output maps directly to shadcn/ui's CSS variable naming convention.

Reference token names:
```css
@theme {
  --color-background: oklch(/* Abyss */);
  --color-card: oklch(/* Void */);
  --color-popover: oklch(/* Lift */);
  --color-border: oklch(/* Rim */);
  --color-muted-foreground: oklch(/* Ash */);
  --color-foreground: oklch(/* Fog */);
  --color-primary: oklch(/* Command */);
}
```

---

## 4. Typography

### 4.1 Type Stack

| Role | Typeface | Weights | Usage |
|------|----------|---------|-------|
| UI / Interface | **Geist Sans** | 400, 500, 600 | All app UI: nav, labels, buttons, tables, forms |
| Monospace / Code | **Geist Mono** | 400, 500 | Agent output, terminal streams, code blocks, file paths |
| Logo mark | **Pinyon Script** | 400 (OFL) | Mark only — converted to SVG paths, not used as a runtime font |

Both Geist variants are available from Google Fonts (open-source, Vercel). Install via `@fontsource/geist` and `@fontsource/geist-mono` for bundler use.

### 4.2 Type Scale

| Name | Size | Weight | Letter-spacing | Color | Usage |
|------|------|--------|---------------|-------|-------|
| Display | 40px | 600 | -0.02em | Snow | Page titles, hero text |
| Heading 1 | 28px | 600 | -0.015em | Snow | Section headers |
| Heading 2 | 22px | 600 | -0.01em | Snow | Card titles, panel headers |
| Heading 3 | 18px | 500 | 0 | Snow | Sub-section titles |
| Body | 14px | 400 | 0 | Fog | Primary readable content |
| Small | 12px | 400 | 0 | Fog | Secondary content, meta |
| Caption | 11px | 500 | 0.02em | Ash | Labels, timestamps, status text |
| Code | 13px | 400 | 0 | Fog | All monospace content (Geist Mono) |

---

## 5. Icon System

### 5.1 Required Sizes

| Size | Format | Platform / Usage |
|------|--------|-----------------|
| 1024×1024 | PNG | macOS App Store, master source |
| 512×512 | PNG | macOS dock (Retina), Linux |
| 256×256 | PNG | Windows large icon, macOS |
| 128×128 | PNG | macOS dock (standard), Linux |
| 64×64 | PNG | Linux, general |
| 48×48 | PNG | Windows medium |
| 32×32 | PNG | Windows small, Linux |
| 16×16 | PNG | Windows tiny, favicon |
| `icon.icns` | ICNS | macOS — all sizes bundled |
| `icon.ico` | ICO | Windows — 16/32/48/64/128/256 bundled |
| `icon-tray.png` | PNG 32×32 | System tray (all platforms) |
| `icon-tray@2x.png` | PNG 64×64 | System tray (Retina) |

### 5.2 Tray Icon Variants
The tray icon uses the micro mark (geometric "A" silhouette):
- **Default:** Snow (`#F0F0F5`) on transparent
- **Active/running:** Command teal (`#2DD4BF`) on transparent
- **Attention/error:** Muted red on transparent

### 5.3 Production Pipeline
```bash
# Step 1: Generate SVG mark using opentype.js script
node scripts/generate-logo-svg.js
# Output: resources/icon-source.svg

# Step 2: Optimize
npx svgo resources/icon-source.svg -o resources/icon-optimized.svg

# Step 3: Generate all icon sizes + ICO + ICNS
npx icon-gen -i resources/icon-optimized.svg -o resources/icons --ico --icns -r
```

---

## 6. Platform Assets — Complete Production List

### 6.1 Application Icons (generate from SVG source)
```
resources/
├── icon.svg              ← Master source (Pinyon Script ADC, path-converted)
├── icon.png              ← 512×512 (electron-builder default)
├── icon.ico              ← Windows (multi-size)
├── icon.icns             ← macOS (multi-size)
├── icon-16.png
├── icon-32.png
├── icon-48.png
├── icon-64.png
├── icon-128.png
├── icon-256.png
├── icon-512.png
├── icon-1024.png
├── icon-tray.png         ← 32×32 system tray
└── icon-tray@2x.png      ← 64×64 system tray (Retina)
```

### 6.2 Website / Marketing Assets (generate separately)
```
brand/
├── logo-full.svg         ← Badge + wordmark lockup (horizontal)
├── logo-badge.svg        ← Badge only (square)
├── logo-wordmark.svg     ← Wordmark only (no badge)
├── logo-dark.svg         ← On dark background variant
├── logo-light.svg        ← On light background variant (if needed)
├── social-preview.png    ← 1200×630 Open Graph image
├── favicon.ico           ← 32×32 for website
└── apple-touch-icon.png  ← 180×180 for iOS bookmark
```

### 6.3 Design Tokens
```
src/renderer/shared/styles/
├── tokens.css            ← @theme {} block, Tailwind v4 CSS variables
└── brand.ts              ← TypeScript const object for use in JS (same values)
```

---

## 7. Design System Integration

### 7.1 Foundation
ADC already uses **shadcn/ui** as its component foundation. The brand design builds on this — no migration needed.

### 7.2 Theme Generation
Use **tweakcn** (https://tweakcn.com) to:
1. Select a near-black dark base
2. Set teal `#2DD4BF` as the primary accent
3. Export Tailwind v4 CSS variable output
4. Drop into `src/renderer/shared/styles/tokens.css`

### 7.3 Recommended Additions

| Library | Purpose | Install |
|---------|---------|---------|
| **tweakcn** | Generate bespoke shadcn/ui dark theme tokens | Web tool |
| **Magic UI** | Developer-tool aesthetic animations (agent status, transitions) | `npx shadcn add "https://magicui.design/r/..."` |
| **@fontsource/geist** | Geist Sans (UI font) | `npm i @fontsource/geist` |
| **@fontsource/geist-mono** | Geist Mono (code font) | `npm i @fontsource/geist-mono` |

---

## 8. Production Toolchain

| Purpose | Tool | Install |
|---------|------|---------|
| SVG optimization | **svgo** | `npm i -D svgo` |
| Font → SVG path conversion | **opentype.js** | `npm i opentype.js` |
| All icon sizes from SVG | **icon-gen** | `npm i -D icon-gen` |
| Design tokens → Tailwind v4 | **style-dictionary** | `npm i -D style-dictionary` |
| Brand PDF / spec export | **md-to-pdf** | `npm i -D md-to-pdf` |
| Script font (monogram source) | **Pinyon Script** | Google Fonts (OFL) |

---

## 9. Implementation Phases

### Phase 1 — Logo SVG (foundation for everything)
1. Download `PinyonScript-Regular.ttf`
2. Write `scripts/generate-logo-svg.js` using `opentype.js` to extract "ADC" paths
3. Compose into final SVG: badge squircle + script paths + teal flourish
4. Optimize with `svgo`
5. Manual refinement pass on SVG paths if needed

### Phase 2 — Icon Generation
1. Run `icon-gen` pipeline → all PNG sizes + ICO + ICNS
2. Replace existing placeholder icons in `resources/`
3. Verify electron-builder picks up correctly

### Phase 3 — Design Tokens
1. Use tweakcn to generate OKLCH-based dark theme
2. Map to ADC palette (Abyss/Void/Lift/Command)
3. Output to `src/renderer/shared/styles/tokens.css`
4. Update Tailwind config to import tokens

### Phase 4 — Typography
1. Install `@fontsource/geist` and `@fontsource/geist-mono`
2. Import in renderer entry point
3. Apply Geist as the default `font-family` via Tailwind `@theme`
4. Audit existing UI for font overrides

### Phase 5 — Brand Assets
1. Generate `brand/` folder assets from the master SVG
2. Update `social-preview.png`
3. Update website favicon and Open Graph image when site is ready
