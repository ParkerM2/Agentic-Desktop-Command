# Item 3: Icon Button Consistency Audit

## Current @ui Icon Component API

**File:** `src/renderer/shared/components/ui/icon.tsx`

The `Icon` component is a variant-driven wrapper for Lucide-compatible icon components. It does NOT handle click behavior -- it is purely presentational.

```ts
interface IconProps extends VariantProps<typeof iconVariants> {
  component: React.ComponentType<{ className?: string }>;
  className?: string;
}
```

**Variants:**
- `variant`: default | muted | success | passed | error | failed | warning | info | active | running | pending
- `size`: xs (h-3 w-3) | sm (h-3.5 w-3.5, default) | md (h-4 w-4) | lg (h-5 w-5)

Base class: `shrink-0`. The Icon component applies color and sizing only. No interactivity, no shape/radius handling.

## Current @ui Button `size="icon"` API

**File:** `src/renderer/shared/components/ui/button.tsx`

The Button component has 4 icon-related size variants:

| Size | Classes | Description |
|------|---------|-------------|
| `icon` | `h-9 w-9` | Standard icon button, inherits base `rounded-md` |
| `icon-sm` | `h-7 w-7 rounded-sm [&_svg]:h-3.5 [&_svg]:w-3.5` | Small icon button |
| `icon-xs` | `h-6 w-6 rounded-sm p-1 [&_svg]:h-3.5 [&_svg]:w-3.5` | Extra-small icon button |
| `toolbar` | `h-full w-10 rounded-none border-border border-l [&_svg]:h-4 [&_svg]:w-4` | Toolbar-specific icon button |

**Button variant relevant to icon usage:**
- `toolbar`: `text-muted-foreground hover:bg-muted hover:text-foreground` -- dedicated variant for toolbar buttons

**Key observation:** The base `rounded-md` in the Button CVA is hardcoded. `icon-sm` and `icon-xs` override to `rounded-sm`. `toolbar` overrides to `rounded-none`. There is no mechanism for the shape to respond to user preferences.

## Theme Store Shape/Radius Capabilities

**File:** `src/renderer/shared/stores/theme-store.ts`

The theme store manages:
- `mode`: light | dark | system
- `colorTheme`: string (default or custom theme ID)
- `uiScale`: number (75-150)
- `customThemes`: CustomTheme[]

**No shape or radius preferences exist.** There is no `borderRadius`, `shape`, `cornerStyle`, or similar property in the theme store.

**File:** `src/renderer/shared/stores/layout-store.ts`

The layout store manages:
- `sidebarLayout`: SidebarLayoutId (16 options)
- `toolbarStyle`: ToolbarStyleId (default | compact | spacious | floating | bordered | glass | minimal | inset)
- `contentLayout`: ContentLayoutId (flush | padded | bordered | inset)

**No shape/radius preferences here either.** The toolbar style affects the toolbar container (height, background, border), but does NOT cascade to individual icon buttons within it.

**Settings UI** (`src/renderer/features/settings/components/LayoutSection.tsx`): Has sidebar style, toolbar style, content area style, and color theme selectors. No shape/radius/corner controls.

## Correct Usage (Button size="icon" family)

**144 instances** across 80 files use `Button` with `size="icon"`, `size="icon-sm"`, `size="icon-xs"`, or `size="toolbar"`.

Breakdown:
- `size="icon"`: ~133 instances across 78 files
- `size="icon-sm"`: 3 instances in `BrowserViewPanel.tsx`
- `size="icon-xs"`: 8 instances across 3 files
- `size="toolbar"` + `variant="toolbar"`: 6 instances across 2 files (TopBar.tsx, TitleBarScreenshot.tsx)

These are all correctly using the @ui Button primitive.

## Violations: Raw `<button>` Elements

**28 raw `<button>` elements** across 18 files. Classified below by type:

### Icon-Only Raw Buttons (should be `Button size="icon"`)

These render only an icon with no visible text label -- prime candidates for `Button size="icon"` or `size="icon-xs"`.

| # | File | Line | Context | Icon |
|---|------|------|---------|------|
| 1 | `src/renderer/app/layouts/ProjectTabBar.tsx` | 74 | "Add project" icon-only button | Plus |
| 2 | `src/renderer/shared/components/WebhookNotification.tsx` | 104 | Dismiss notification | X |
| 3 | `src/renderer/shared/components/HubNotification.tsx` | 125 | Dismiss hub notification | X |
| 4 | `src/renderer/shared/components/MutationErrorToast.tsx` | 103 | Dismiss toast | X |
| 5 | `src/renderer/shared/components/AppUpdateNotification.tsx` | 99 | Dismiss update notification | X |
| 6 | `src/renderer/shared/components/AuthNotification.tsx` | 74 | Dismiss auth notification | X |
| 7 | `src/renderer/shared/components/ui/search-input.tsx` | 38 | Clear search | X |
| 8 | `src/renderer/shared/components/ui/sidebar.tsx` | 255 | SidebarRail toggle | (invisible hit area) |

### Text+Icon Raw Buttons (should be `Button` with variant)

These have both icon and text -- should use `Button` with an appropriate variant instead of raw `<button>`.

| # | File | Line | Context |
|---|------|------|---------|
| 9 | `src/renderer/app/router.tsx` | 64 | Error page "Retry" (icon + text) |
| 10 | `src/renderer/shared/components/IntegrationRequired.tsx` | 58 | "Set Up in Settings" (icon + text) |
| 11 | `src/renderer/shared/components/error-boundaries/FeatureErrorBoundary.tsx` | 91 | "Retry" (icon + text) |
| 12 | `src/renderer/shared/components/error-boundaries/FeatureErrorBoundary.tsx` | 99 | "Copy Error Details" (icon + text) |
| 13 | `src/renderer/shared/components/error-boundaries/RouteErrorBoundary.tsx` | 105 | "Go to Dashboard" (icon + text) |
| 14 | `src/renderer/shared/components/error-boundaries/RouteErrorBoundary.tsx` | 113 | "Retry" (icon + text) |
| 15 | `src/renderer/shared/components/error-boundaries/RouteErrorBoundary.tsx` | 122 | "Copy Error Details" (icon + text) |
| 16 | `src/renderer/shared/components/error-boundaries/RootErrorBoundary.tsx` | 88 | "Reload App" (icon + text) |
| 17 | `src/renderer/shared/components/error-boundaries/RootErrorBoundary.tsx` | 96 | "Copy Error Details" (icon + text) |
| 18 | `src/renderer/shared/components/AppUpdateNotification.tsx` | 82 | "Restart" (text only) |
| 19 | `src/renderer/shared/components/AppUpdateNotification.tsx` | 90 | "Download" (text only) |
| 20 | `src/renderer/shared/components/AuthNotification.tsx` | 53 | "Authorize in Settings" (icon + text) |
| 21 | `src/renderer/shared/components/ConfirmDialog.tsx` | 109 | Cancel button (text only) |
| 22 | `src/renderer/shared/components/ConfirmDialog.tsx` | 120 | Confirm button (text only) |

### Composite/Special Raw Buttons (contextual -- may need different treatment)

| # | File | Line | Context |
|---|------|------|---------|
| 23 | `src/renderer/app/layouts/ProjectTabBar.tsx` | 49 | Tab button (icon + text + close button) |
| 24 | `src/renderer/shared/components/HubStatus.tsx` | 66 | Hub status indicator (icon/dot + text) |
| 25 | `src/renderer/shared/components/HubConnectionIndicator.tsx` | 73 | Hub connection sidebar item (dot + text) |
| 26 | `src/renderer/app/layouts/UserMenu.tsx` | 65 | User menu trigger (avatar + name + chevron) |
| 27 | `src/renderer/features/test-suite/components/ScreenshotGallery.tsx` | 74 | Screenshot card (image + metadata) |
| 28 | `src/renderer/features/test-suite/components/ScreenshotGallery.tsx` | 141 | Thumbnail nav strip button (image) |

## Summary Counts

| Category | Count |
|----------|-------|
| **Correct usage** (Button size="icon/icon-sm/icon-xs/toolbar") | **144** |
| **Icon-only raw `<button>` violations** | **8** |
| **Text+Icon raw `<button>` violations** | **14** |
| **Composite/special raw `<button>`** | **6** |
| **Total raw `<button>`** | **28** |

## Analysis

### What works well
- The `size="toolbar"` + `variant="toolbar"` pattern in TopBar.tsx is clean and consistent
- The `size="icon-xs"` variant is well-used in dense UI (task grids, step lists)
- ~84% of icon buttons (144 of 172 total) correctly use @ui Button

### Gaps

1. **No shape preference system.** The `rounded-md` in Button base is hardcoded. There is no way for users to choose square, rounded, or pill icon buttons. Toolbar style (`floating`, `bordered`, etc.) only affects the toolbar container, not the buttons inside it.

2. **No `IconButton` convenience component.** Every icon button must manually compose `<Button size="icon" variant="ghost">` + child SVG. An `IconButton` could enforce `aria-label`, tooltip, and shape consistency.

3. **Dismiss buttons are all raw `<button>`.** The 5 notification dismiss patterns (WebhookNotification, HubNotification, MutationErrorToast, AppUpdateNotification, AuthNotification) all use raw `<button>` with identical styling (`text-muted-foreground hover:text-foreground shrink-0 p-0.5` + X icon). This is a clear extraction candidate.

4. **Error boundaries use raw `<button>` by design.** The 3 error boundary files (Root, Route, Feature) are class components that deliberately avoid importing @ui to minimize dependency risk in crash scenarios. These are defensible violations.

5. **SearchInput's clear button is raw.** The @ui `search-input.tsx` component itself uses a raw `<button>` for the clear action rather than using the @ui Button.

## Recommended Approach

### 1. Add shape preference to theme store

```ts
// In theme-store.ts
type IconButtonShape = 'rounded' | 'square' | 'pill';

interface ThemeState {
  // ... existing
  iconButtonShape: IconButtonShape;
  setIconButtonShape: (shape: IconButtonShape) => void;
}
```

Map to CSS custom property: `--icon-button-radius: var(--radius-md | 0 | 9999px)`

### 2. Create `IconButton` convenience component

```tsx
// src/renderer/shared/components/ui/icon-button.tsx
interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  icon: React.ComponentType<{ className?: string }>;
  label: string;        // Required aria-label
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'toolbar';
  tooltip?: boolean;    // Auto-wrap in Tooltip
}
```

This enforces:
- Required `aria-label` via the `label` prop
- Shape awareness via theme store subscription
- Consistent icon sizing per button size
- Optional tooltip integration

### 3. Create `DismissButton` extraction

A small `DismissButton` component for the 5+ notification dismiss patterns:
```tsx
function DismissButton({ onDismiss, label }: { onDismiss: () => void; label?: string }) {
  return (
    <IconButton icon={X} label={label ?? 'Dismiss'} size="xs" variant="ghost" />
  );
}
```

### 4. Fix priority order

1. **SearchInput** (in @ui itself -- highest visibility)
2. **Notification dismiss buttons** (5 files, identical pattern)
3. **ProjectTabBar** add-project button (1 file)
4. **HubStatus / HubConnectionIndicator** (sidebar visibility)
5. **ConfirmDialog** cancel/confirm buttons (2 raw buttons)
6. **Error boundaries** -- leave as-is (crash-safety justification)

### 5. Shape-aware Button variant (alternative to IconButton)

Instead of a new component, extend the existing Button CVA with a CSS custom property approach:

```ts
// In button.tsx base string, replace hardcoded rounded-md:
'rounded-[var(--btn-radius,0.375rem)]'

// icon-sm / icon-xs override:
'rounded-[var(--btn-radius-sm,0.125rem)]'
```

Then the theme store sets `--btn-radius` on `<html>` based on user preference. This approach is lighter than a new component and applies to ALL buttons automatically.
