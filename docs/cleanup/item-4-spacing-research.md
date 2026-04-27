# Item 4: Layout Spacing Standardization Research

## 1. Current Theme Store Pattern (how values are applied to `<html>`)

**File:** `src/renderer/shared/stores/theme-store.ts`

The theme store uses Zustand and applies values to `document.documentElement` via three mechanisms:

- **Mode (dark/light):** `applyMode()` adds/removes CSS classes on `<html>` (`classList.add('dark')`)
- **Custom tokens:** `applyCustomTokens()` calls `root.style.setProperty('--token', value)` for each color token
- **UI Scale:** `applyUiScale()` calls `root.setAttribute('data-ui-scale', String(scale))`

The `data-ui-scale` attribute is then consumed in `globals.css` by attribute selectors:

```css
[data-ui-scale='100'] { font-size: 16px; }
[data-ui-scale='105'] { font-size: 16.8px; }
/* ... etc for 75-150 in steps of 5 */
```

**Recommended approach for spacing:** Use `document.documentElement.style.setProperty('--layout-gap', value)` directly, which is simpler than the data-attribute approach since we need a continuous CSS custom property value, not discrete steps that map to fixed values.

---

## 2. Settings > Display Slider Implementation

**File:** `src/renderer/features/settings/components/UiScaleSection.tsx`

Pattern:
- Constants: `UI_SCALE_MIN = 75`, `UI_SCALE_MAX = 150`, `UI_SCALE_STEP = 5`
- Component receives `currentScale: number` and `onScaleChange` callback as props
- Uses `<Input type="range">` from `@ui` (not raw HTML)
- Shows min/max labels on left/right, current value centered below
- Styled: `className="bg-muted accent-primary h-2 flex-1 cursor-pointer appearance-none rounded-full border-0"`

**Wiring in SettingsPage** (`src/renderer/features/settings/components/SettingsPage.tsx`, line 108):
```tsx
<UiScaleSection currentScale={uiScale} onScaleChange={handleUiScaleChange} />
```

The handler (line 63):
```tsx
function handleUiScaleChange(event: React.ChangeEvent<HTMLInputElement>) {
  const scale = Number(event.target.value);
  setUiScale(scale);                        // Updates Zustand store + applies to DOM
  updateSettings.mutate({ uiScale: scale }); // Persists via IPC
}
```

**Persistence path:**
1. Zustand store setter applies to DOM immediately
2. `updateSettings.mutate()` calls `ipc(SETTINGS.UPDATE.ALL, updates)` which is a `z.record(z.string(), z.unknown())` input
3. On app load, `useSettings` queryFn fetches settings and calls `setUiScale(settings.uiScale)` to restore

---

## 3. Inventory of All Layout Gap/Spacing Values

### A. Page Layout Primitives (`src/renderer/shared/components/ui/page-layout.tsx`)

| Component | Line | Classes | Layout Role |
|---|---|---|---|
| `PageLayout` | 47 | `flex h-full w-full flex-col` | No gap — pure flex column |
| `PageHeader` | 69 | `flex w-full shrink-0 flex-col border-b` | No gap/padding — children control it |
| `PageHeader.Row` | 90 | `gap-4 px-6 py-4` | **gap-4** between title/actions, **px-6 py-4** padding |
| `PageHeader.Actions` | 132 | `gap-2` | **gap-2** between action buttons |
| `PageHeader.TabList` | 163 | `gap-1 px-6` | **gap-1** between tabs, **px-6** horizontal padding |
| `PageHeader.Tab` | 181 | `gap-2 px-3 py-2` | **gap-2** icon-to-label, **px-3 py-2** internal |
| `PageContent` | 212 | `px-6 py-4` | **px-6 py-4** — main content padding |

### B. App Shell Layouts (`src/renderer/app/layouts/`)

| Component | File | Line | Classes | Layout Role |
|---|---|---|---|---|
| RootLayout root | `RootLayout.tsx` | 78 | `flex h-screen flex-col` | No gap |
| LayoutWrapper | `LayoutWrapper.tsx` | 18 | `SidebarProvider className="h-full"` | No explicit gap |
| SidebarInset | `sidebar.tsx` | 283 | `relative flex w-full min-w-0 flex-1 flex-col` | Sidebar-to-content: handled by sidebar gap element |
| ContentAreaContainer (flush) | `ContentAreaContainer.tsx` | 23 | (empty string) | No gap/padding |
| ContentAreaContainer (padded) | `ContentAreaContainer.tsx` | 24 | `p-2 gap-2` | **p-2 gap-2** |
| ContentAreaContainer (bordered) | `ContentAreaContainer.tsx` | 25 | `p-2 gap-2` | **p-2 gap-2** |
| ContentAreaContainer (inset) | `ContentAreaContainer.tsx` | 26 | `p-3 gap-3` | **p-3 gap-3** |
| TopBar | `TopBar.tsx` | 102 | `flex shrink-0 items-stretch` + height from TOOLBAR_CLASSES | No gap — items stretch |
| TitleBar | `TitleBar.tsx` | 70 | `flex h-8 shrink-0 items-center border-b` | No gap |
| ContentHeader | `ContentHeader.tsx` | 16 | `gap-2 px-3` | **gap-2** between trigger/breadcrumbs |
| ProjectTabBar | `ProjectTabBar.tsx` | 44 | `gap-px px-1` | **gap-px** between tab buttons |

### C. Sidebar Internals (`src/renderer/shared/components/ui/sidebar.tsx`)

| Component | Line | Classes | Layout Role |
|---|---|---|---|
| SidebarHeader | 311 | `gap-2 p-2` | **gap-2 p-2** |
| SidebarFooter | 322 | `gap-2 p-2` | **gap-2 p-2** |
| SidebarContent | 350 | `gap-2` | **gap-2** between groups |
| SidebarGroup | 363 | `p-2` | **p-2** group padding |
| SidebarMenu | 430 | `gap-1` | **gap-1** between menu items |
| SidebarMenuSub | 603 | `gap-1 px-2.5 py-0.5` | **gap-1** sub items |
| SidebarMenuButton | 450 | `gap-2 p-2` | **gap-2** icon-to-text |
| SidebarMenuSkeleton | 578 | `gap-2 px-2` | **gap-2** skeleton items |

### D. Composition Components (`src/renderer/shared/components/ui/composition/`)

| Component | File | Line | Classes | Layout Role |
|---|---|---|---|---|
| FilterBar | `FilterBar.tsx` | 167 | `gap-3 px-4 py-3` | **gap-3** between filters, **px-4 py-3** padding |
| FilterBar (multi-select) | `FilterBar.tsx` | 56 | `gap-1` | **gap-1** between toggle buttons |
| ActionBar | `ActionBar.tsx` | 39 | `gap-2 px-4 py-3` | **gap-2** between actions, **px-4 py-3** padding |
| DetailPanel header | `DetailPanel.tsx` | 63 | `px-4 py-3` | **px-4 py-3** |
| DetailPanel content | `DetailPanel.tsx` | 76 | `px-4 py-4` | **px-4 py-4** |

### E. Sidebar Gap Element (`sidebar.tsx`, line 186-194)

The sidebar uses a "gap element" div for the space between sidebar and content:
- Default variant: width matches `--sidebar-width` (no additional gap)
- Floating/inset variant: adds `+16px` for icon mode

There is no explicit gap between sidebar and content — the sidebar-gap div is a sizing spacer for the fixed sidebar, not a visible gap.

---

## 4. Layout Region Map

```
+------------------------------------------------------------------+
|  TopBar (h-8 to h-12 depending on toolbar style)                 |
|  [SidebarToggle | ProjectTabs ... | Spacer | Utils | WinControls]|
+------------------------------------------------------------------+
|              |                                                    |
|  Sidebar     |  Content Area                                     |
|  (16rem /    |  +----------------------------------------------+ |
|   3rem icon) |  | PageHeader (border-b)                        | |
|              |  |   Row: px-6 py-4 gap-4                       | |
|              |  |   TabList: px-6 gap-1                        | |
|              |  +----------------------------------------------+ |
|  Header p-2  |  | PageContent: px-6 py-4                       | |
|  Content     |  |                                               | |
|  gap-2       |  |  [FilterBar: px-4 py-3 gap-3]                | |
|  Group p-2   |  |  [Main content area]                         | |
|  Menu gap-1  |  |  [ActionBar: px-4 py-3 gap-2]                | |
|  Footer p-2  |  |                                               | |
|              |  +----------------------------------------------+ |
+------------------------------------------------------------------+
```

### Region Gaps:

| Region Boundary | Current Gap | Where Defined |
|---|---|---|
| **Sidebar <-> Content** | 0px (flush) / sidebar-gap element | `sidebar.tsx` line 186 |
| **TopBar <-> Content** | 0px (flush layout) / `gap-2` (padded) / `gap-3` (inset) | `ContentAreaContainer.tsx` |
| **PageHeader <-> PageContent** | 0px (border-b provides visual separation) | `page-layout.tsx` |
| **TabList <-> TabContent** | 0px (tabs sit in header, content in PageContent) | `page-layout.tsx` |
| **FilterBar <-> Content** | Managed by consumer padding | Per-feature |
| **Content <-> ActionBar** | 0px (sticky bottom with border-t) | `ActionBar.tsx` |
| **DetailPanel header <-> content** | 0px (border-b separation) | `DetailPanel.tsx` |

---

## 5. Hardcoded Pixel/Rem Values in Inline Styles

**No inline `style={{ gap: ... }}` or `style={{ padding: ... }}` found** in any layout component. All spacing uses Tailwind utility classes. This is good for standardization.

The only inline styles related to layout are:
- `sidebar.tsx` line 129: `--sidebar-width: 16rem` and `--sidebar-width-icon: 3rem` (CSS custom properties, appropriate)

---

## 6. Recommended CSS Custom Property Design

### Property: `--layout-gap`

A single CSS custom property that controls the spacing between major layout regions. This maps to a `rem` value.

**Default:** `0.5rem` (8px at default scale = `gap-2`)

**Tailwind integration:** In `globals.css`, define inside `:root` and `.dark`:
```css
:root {
  --layout-gap: 0.5rem;
}
```

Then in the `@theme` block:
```css
@theme {
  --spacing-layout: var(--layout-gap);
}
```

This enables `gap-layout`, `p-layout`, `px-layout`, `py-layout` as Tailwind utilities.

### What it controls (and what it does NOT):

**Controlled by `--layout-gap`** (layout shell spacing):
- `ContentAreaContainer` container padding and gap (currently `p-2 gap-2` / `p-3 gap-3`)
- `PageHeader.Row` padding (`px-6 py-4` -> could use a multiplied variant)
- `PageContent` padding (`px-6 py-4`)
- `FilterBar` padding (`px-4 py-3`)
- `ActionBar` padding (`px-4 py-3`)
- `DetailPanel` header/content padding (`px-4 py-3`, `px-4 py-4`)

**NOT controlled** (component-internal spacing that should remain fixed):
- `gap-1` between menu items, tabs, action buttons (micro-spacing)
- `gap-2` between icon and text in buttons/menu items (element-level)
- `p-2` inside sidebar groups (component density, not layout)
- `px-3 py-2` inside tab triggers (component sizing)

### Derived properties for proportional scaling:

```css
:root {
  --layout-gap: 0.5rem;          /* base: 8px */
  --layout-gap-sm: calc(var(--layout-gap) * 0.75);  /* 6px */
  --layout-gap-lg: calc(var(--layout-gap) * 1.5);   /* 12px */
  --layout-pad-x: calc(var(--layout-gap) * 3);      /* 24px = px-6 equivalent */
  --layout-pad-y: calc(var(--layout-gap) * 2);       /* 16px = py-4 equivalent */
}
```

---

## 7. Recommended Slider Range and Steps

| Property | Value |
|---|---|
| **Min** | 0 (flush — zero gaps between regions) |
| **Max** | 16 (spacious — `1rem` = 16px base gap) |
| **Step** | 2 (9 discrete positions: 0, 2, 4, 6, 8, 10, 12, 14, 16) |
| **Default** | 8 (= `0.5rem`, matches current `gap-2` / `p-2`) |
| **Unit** | pixels (displayed) / rem (applied as `--layout-gap: ${value/16}rem`) |

**Preset labels (optional):**
- 0 = Flush
- 4 = Compact
- 8 = Default
- 12 = Relaxed
- 16 = Spacious

---

## 8. Files That Need Modification

### New/Modified for the feature:

| File | Change |
|---|---|
| `src/renderer/shared/stores/theme-store.ts` | Add `layoutGap: number`, `setLayoutGap()`, `applyLayoutGap()` |
| `src/renderer/styles/globals.css` | Add `--layout-gap` to `:root`, add `--spacing-layout` to `@theme` block, add derived properties |
| `src/renderer/features/settings/components/SettingsPage.tsx` | Wire new `SpacingSection` into Display tab |
| `src/renderer/features/settings/components/SpacingSection.tsx` | **New file** — slider component (copy UiScaleSection pattern) |
| `src/shared/ipc/settings/schemas.ts` | Add `layoutGap: z.number().optional()` to `AppSettingsSchema` |
| `src/renderer/features/settings/api/useSettings.ts` | Add `setLayoutGap(settings.layoutGap)` to queryFn |

### Layout components to convert to use `--layout-gap`:

| File | Lines to Change | Current | New |
|---|---|---|---|
| `src/renderer/app/layouts/ContentAreaContainer.tsx` | 24-26 | `p-2 gap-2` / `p-3 gap-3` | Use `--layout-gap` CSS var via Tailwind custom spacing |
| `src/renderer/shared/components/ui/page-layout.tsx` | 90, 212 | `px-6 py-4` | `px-[var(--layout-pad-x)] py-[var(--layout-pad-y)]` or `p-layout-*` |
| `src/renderer/shared/components/ui/composition/FilterBar.tsx` | 167 | `gap-3 px-4 py-3` | Use layout gap tokens |
| `src/renderer/shared/components/ui/composition/ActionBar.tsx` | 39 | `gap-2 px-4 py-3` | Use layout gap tokens |
| `src/renderer/shared/components/ui/composition/DetailPanel.tsx` | 63, 76 | `px-4 py-3`, `px-4 py-4` | Use layout gap tokens |
| `src/renderer/app/layouts/ContentHeader.tsx` | 16 | `gap-2 px-3` | Use layout gap tokens |

### Settings page sections (minor — padding for sections):

| File | Current | Note |
|---|---|---|
| `src/renderer/features/settings/components/SettingsPage.tsx` | `mb-8` on sections | Could be driven by `--layout-gap` but lower priority |

### Main process (persistence):

| File | Change |
|---|---|
| `src/main/features/settings/settings-service.ts` | Accept `layoutGap` in update handler, persist to settings.json |
