# Layout Preset Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 16 sidebar / 8 toolbar / 4 content / 3 icon-shape individual selectors with a single Layout Preset dropdown (`default` | `floating`) plus Color Theme.

**Architecture:** New `LayoutPreset` type in shared types maps to fixed `{ sidebar, toolbar, content }` combos. Layout store holds the preset and exposes derived values so downstream readers (`TopBar`, `ContentAreaContainer`, `AppSidebar`) keep working. Icon shape CSS vars become static defaults — no runtime override.

**Tech Stack:** TypeScript, Zustand, Zod, React, TanStack Query, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-21-layout-preset-simplification-design.md`

---

## Parallelization Map

```
Wave 1 (parallel): Task 1 + Task 2 + Task 3
   │                 │         │         │
   │  shared types   │  CSS    │ sidebar │
   │  + schemas      │ cleanup │ configs │
   ▼                 ▼         ▼         ▼
Wave 2 (parallel): Task 4 + Task 5
   │                 │         │
   │  stores         │ backend │
   │  (theme+layout) │ service │
   ▼                 ▼         ▼
Wave 3 (sequential): Task 6
   │
   │  renderer UI + hooks
   ▼
Wave 4 (sequential): Task 7
   │
   │  TopBar + ContentAreaContainer cleanup
   ▼
Wave 5 (sequential): Task 8
   │
   │  typecheck + lint + verify
```

---

### Task 1: Shared Types + Zod Schemas

**Files:**
- Modify: `src/shared/types/layout.ts`
- Modify: `src/shared/types/settings.ts`
- Modify: `src/shared/ipc/settings/schemas.ts`

- [ ] **Step 1: Rewrite `src/shared/types/layout.ts`**

Replace the entire file contents with:

```typescript
/**
 * Layout Types — Preset-based layout system
 *
 * Two layout presets (default, floating) each map to a fixed
 * sidebar + toolbar + content combination.
 */

// ── Sidebar ────────────────────────────────────────────────

export type SidebarLayoutId = 'sidebar-04' | 'sidebar-07';

export interface SidebarLayoutMeta {
  id: SidebarLayoutId;
  label: string;
  description: string;
}

export const SIDEBAR_LAYOUTS: SidebarLayoutMeta[] = [
  { id: 'sidebar-07', label: 'Icon Collapse', description: 'Sidebar that collapses to icons' },
  { id: 'sidebar-04', label: 'Floating', description: 'Floating sidebar with detached visual style' },
];

export const SIDEBAR_LAYOUT_IDS: [SidebarLayoutId, ...SidebarLayoutId[]] = [
  'sidebar-04', 'sidebar-07',
];

// ── Toolbar ────────────────────────────────────────────────

export type ToolbarStyleId = 'default' | 'floating';

export interface ToolbarStyleMeta {
  id: ToolbarStyleId;
  label: string;
  description: string;
}

export const TOOLBAR_STYLES: ToolbarStyleMeta[] = [
  { id: 'default', label: 'Standard', description: 'Default toolbar with solid background and bottom border' },
  { id: 'floating', label: 'Floating', description: 'Detached bar with rounded corners and shadow' },
];

export const TOOLBAR_STYLE_IDS: [ToolbarStyleId, ...ToolbarStyleId[]] = [
  'default', 'floating',
];

// ── Content ────────────────────────────────────────────────

export type ContentLayoutId = 'flush' | 'bordered';

export interface ContentLayoutMeta {
  id: ContentLayoutId;
  label: string;
  description: string;
}

export const CONTENT_LAYOUTS: ContentLayoutMeta[] = [
  { id: 'flush', label: 'Flush', description: 'No padding — content extends edge to edge' },
  { id: 'bordered', label: 'Bordered', description: 'Rounded border with inner spacing' },
];

export const CONTENT_LAYOUT_IDS: [ContentLayoutId, ...ContentLayoutId[]] = [
  'flush', 'bordered',
];

// ── Layout Presets ─────────────────────────────────────────

export type LayoutPreset = 'default' | 'floating';

export interface LayoutPresetConfig {
  id: LayoutPreset;
  label: string;
  description: string;
  sidebar: SidebarLayoutId;
  toolbar: ToolbarStyleId;
  content: ContentLayoutId;
}

export const LAYOUT_PRESETS: LayoutPresetConfig[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Icon-collapse sidebar, flush content, standard toolbar',
    sidebar: 'sidebar-07',
    toolbar: 'default',
    content: 'flush',
  },
  {
    id: 'floating',
    label: 'Floating',
    description: 'Floating sidebar and toolbar, bordered content area',
    sidebar: 'sidebar-04',
    toolbar: 'floating',
    content: 'bordered',
  },
];

export const LAYOUT_PRESET_IDS: [LayoutPreset, ...LayoutPreset[]] = [
  'default', 'floating',
];

/** Look up a preset config by ID, falling back to 'default' */
export function getPresetConfig(id: LayoutPreset): LayoutPresetConfig {
  return LAYOUT_PRESETS.find((p) => p.id === id) ?? LAYOUT_PRESETS[0];
}
```

- [ ] **Step 2: Update `src/shared/types/settings.ts`**

Remove `sidebarLayout` import. Add `LayoutPreset` import. Remove `iconButtonShape`, `toolbarStyle`, `contentLayout`, and `sidebarLayout` fields from `AppSettings`. Add `layoutPreset`.

Replace:
```typescript
import type { SidebarLayoutId } from './layout';
```
with:
```typescript
import type { LayoutPreset } from './layout';
```

In the `AppSettings` interface, remove these lines:
```typescript
  sidebarLayout?: SidebarLayoutId;
  toolbarStyle?: string;
  contentLayout?: string;
  iconButtonShape?: 'rounded' | 'square' | 'pill';
```

Add this line (place it after `uiScale`):
```typescript
  layoutPreset?: LayoutPreset;
```

- [ ] **Step 3: Update `src/shared/ipc/settings/schemas.ts`**

Remove the `SIDEBAR_LAYOUT_IDS` import at line 10:
```typescript
import { SIDEBAR_LAYOUT_IDS } from '@shared/types/layout';
```
Replace with:
```typescript
import { LAYOUT_PRESET_IDS } from '@shared/types/layout';
```

In `AppSettingsSchema`, remove:
```typescript
  sidebarLayout: z.enum(SIDEBAR_LAYOUT_IDS as [string, ...string[]]).optional(),
  iconButtonShape: z.enum(['rounded', 'square', 'pill']).optional(),
```

Add (after `uiScale`):
```typescript
  layoutPreset: z.enum(LAYOUT_PRESET_IDS).optional(),
```

In `LayoutStateSchema`, replace:
```typescript
export const LayoutStateSchema = z.object({
  openProjectTabs: z.array(z.string()),
  activeProjectId: z.string().nullable(),
  lastRoutePerProject: z.record(z.string(), z.string()),
  sidebarCollapsed: z.boolean(),
  sidebarLayout: z.string(),
  toolbarStyle: z.string().optional(),
  contentLayout: z.string().optional(),
});
```
with:
```typescript
export const LayoutStateSchema = z.object({
  openProjectTabs: z.array(z.string()),
  activeProjectId: z.string().nullable(),
  lastRoutePerProject: z.record(z.string(), z.string()),
  sidebarCollapsed: z.boolean(),
  layoutPreset: z.string(),
});
```

In `LayoutUpdateSchema`, replace:
```typescript
export const LayoutUpdateSchema = z.object({
  openProjectTabs: z.array(z.string()).optional(),
  activeProjectId: z.string().nullable().optional(),
  lastRoutePerProject: z.record(z.string(), z.string()).optional(),
  sidebarCollapsed: z.boolean().optional(),
  sidebarLayout: z.string().optional(),
  toolbarStyle: z.string().optional(),
  contentLayout: z.string().optional(),
});
```
with:
```typescript
export const LayoutUpdateSchema = z.object({
  openProjectTabs: z.array(z.string()).optional(),
  activeProjectId: z.string().nullable().optional(),
  lastRoutePerProject: z.record(z.string(), z.string()).optional(),
  sidebarCollapsed: z.boolean().optional(),
  layoutPreset: z.string().optional(),
});
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/layout.ts src/shared/types/settings.ts src/shared/ipc/settings/schemas.ts
git commit -m "refactor(types): replace individual layout fields with LayoutPreset type"
```

---

### Task 2: CSS Cleanup — Static Button Radius

**Files:**
- Modify: `src/renderer/styles/globals.css` (lines ~260-261)

- [ ] **Step 1: Verify current CSS vars in `globals.css`**

Read `src/renderer/styles/globals.css` around lines 255-265 to confirm `--btn-radius` and `--btn-icon-radius` are declared there.

- [ ] **Step 2: No changes needed**

The CSS already declares static defaults:
```css
--btn-radius: 0.375rem;
--btn-icon-radius: 0.125rem;
```

And `button.tsx` uses `var(--btn-radius, 0.375rem)` with fallbacks. Once the theme store stops overriding these at runtime (Task 4), the static CSS values apply. No CSS file changes needed.

- [ ] **Step 3: Commit (skip — no changes)**

This task confirms the CSS is already correct. No commit needed.

---

### Task 3: Sidebar Layout Configs Cleanup

**Files:**
- Modify: `src/renderer/app/layouts/sidebar-layouts/layout-configs.ts`

- [ ] **Step 1: Strip unused configs from `layout-configs.ts`**

Replace the entire `LAYOUT_CONFIGS` record with only the two kept configs:

```typescript
export const LAYOUT_CONFIGS: Record<SidebarLayoutId, SidebarLayoutConfig> = {
  'sidebar-04': { groupStyle: 'collapsible', variant: 'floating' },
  'sidebar-07': { groupStyle: 'flat', showTooltips: true },
};
```

Keep all the type definitions (`CollapsibleMode`, `SidebarVariant`, `GroupStyle`, `SidebarSide`, `DevSubGroup`, `DualSidebarConfig`, `SidebarLayoutConfig`) as-is — they're referenced by `AppSidebar.tsx`.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/app/layouts/sidebar-layouts/layout-configs.ts
git commit -m "refactor(layout): remove unused sidebar layout configs, keep sidebar-04 and sidebar-07"
```

---

### Task 4: Store Cleanup — Theme Store + Layout Store

**Files:**
- Modify: `src/renderer/shared/stores/theme-store.ts`
- Modify: `src/renderer/shared/stores/layout-store.ts`
- Modify: `src/renderer/shared/stores/index.ts`

- [ ] **Step 1: Remove icon button shape from theme store**

In `src/renderer/shared/stores/theme-store.ts`:

1. Remove the `IconButtonShape` type export
2. Remove `iconButtonShape` from the `ThemeState` interface
3. Remove `setIconButtonShape` from the `ThemeState` interface
4. Remove the `BUTTON_SHAPE_RADIUS` constant
5. Remove the `ICON_BUTTON_SHAPE_RADIUS` constant
6. Remove the `applyIconButtonShape` function
7. Remove `iconButtonShape: 'rounded'` from the store initial state
8. Remove the `setIconButtonShape` action

The full updated file:

```typescript
/**
 * Theme Store — Global UI theme state
 *
 * Manages dark/light/system mode, color theme, UI scale, and custom themes.
 * Applies classes, attributes, and CSS custom properties to <html> for CSS to consume.
 */

import { create } from 'zustand';

import { THEME_TOKEN_KEYS } from '@shared/constants/themes';
import type { CustomTheme, ThemeMode } from '@shared/types';

interface ThemeState {
  mode: ThemeMode;
  colorTheme: string;
  uiScale: number;
  customThemes: CustomTheme[];
  layoutGap: number;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: string) => void;
  setUiScale: (scale: number) => void;
  setCustomThemes: (themes: CustomTheme[]) => void;
  setLayoutGap: (gap: number) => void;
}

function resolveEffectiveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolveEffectiveMode(mode));
}

function applyCustomTokens(
  themeId: string,
  customThemes: CustomTheme[],
  mode: ThemeMode,
): void {
  const root = document.documentElement;

  if (themeId === 'default') {
    for (const key of THEME_TOKEN_KEYS) {
      root.style.removeProperty(`--${key}`);
    }
    root.removeAttribute('data-theme');
    return;
  }

  const theme = customThemes.find((t) => t.id === themeId);
  if (theme === undefined) {
    for (const key of THEME_TOKEN_KEYS) {
      root.style.removeProperty(`--${key}`);
    }
    root.removeAttribute('data-theme');
    return;
  }

  const effectiveMode = resolveEffectiveMode(mode);
  const palette = effectiveMode === 'dark' ? theme.dark : theme.light;

  for (const key of THEME_TOKEN_KEYS) {
    root.style.setProperty(`--${key}`, palette[key]);
  }

  root.setAttribute('data-theme', themeId);
}

function applyUiScale(scale: number): void {
  document.documentElement.setAttribute('data-ui-scale', String(scale));
}

function applyLayoutGap(gap: number): void {
  const root = document.documentElement;
  root.style.setProperty('--layout-gap', `${gap / 16}rem`);
  root.style.setProperty('--layout-gap-sm', `${(gap * 0.75) / 16}rem`);
  root.style.setProperty('--layout-gap-lg', `${(gap * 1.5) / 16}rem`);
  root.style.setProperty('--layout-pad-x', `${(gap * 3) / 16}rem`);
  root.style.setProperty('--layout-pad-y', `${(gap * 2) / 16}rem`);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  colorTheme: 'default',
  uiScale: 100,
  customThemes: [],
  layoutGap: 8,
  setMode: (mode) => {
    set({ mode });
    applyMode(mode);
    const { colorTheme, customThemes } = get();
    if (colorTheme !== 'default') {
      applyCustomTokens(colorTheme, customThemes, mode);
    }
  },
  setColorTheme: (colorTheme) => {
    set({ colorTheme });
    const { customThemes, mode } = get();
    applyCustomTokens(colorTheme, customThemes, mode);
  },
  setUiScale: (scale) => {
    const uiScale = Math.max(75, Math.min(150, scale));
    set({ uiScale });
    applyUiScale(uiScale);
  },
  setCustomThemes: (customThemes) => {
    set({ customThemes });
    const { colorTheme, mode } = get();
    if (colorTheme !== 'default') {
      applyCustomTokens(colorTheme, customThemes, mode);
    }
  },
  setLayoutGap: (gap) => {
    const layoutGap = Math.max(0, Math.min(16, gap));
    set({ layoutGap });
    applyLayoutGap(layoutGap);
  },
}));
```

- [ ] **Step 2: Rewrite layout store for preset-based system**

Replace `src/renderer/shared/stores/layout-store.ts` entirely:

```typescript
/**
 * Layout Store — Global layout/navigation state
 *
 * Preset-based layout system: a single layoutPreset value drives
 * sidebar, toolbar, and content styles. Derived getters let downstream
 * components (TopBar, ContentAreaContainer, AppSidebar) read individual
 * values without knowing about presets.
 *
 * Persists layout state to settings.json via IPC with 500ms debounce.
 */

import { create } from 'zustand';

import { SETTINGS } from '@shared/ipc/settings/channels';
import { WORKSPACE } from '@shared/ipc/workspace/channels';
import type { ContentLayoutId, LayoutPreset, SidebarLayoutId, ToolbarStyleId } from '@shared/types/layout';
import { getPresetConfig } from '@shared/types/layout';

import { ipc } from '@renderer/shared/lib/ipc';

import type { Layout } from 'react-resizable-panels';

interface LayoutState {
  sidebarCollapsed: boolean;
  layoutPreset: LayoutPreset;
  activeProjectId: string | null;
  projectTabOrder: string[];
  panelLayout: Layout | null;

  // Derived from layoutPreset — read-only for consumers
  sidebarLayout: SidebarLayoutId;
  toolbarStyle: ToolbarStyleId;
  contentLayout: ContentLayoutId;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLayoutPreset: (preset: LayoutPreset) => void;
  setActiveProject: (projectId: string | null) => void;
  setProjectTabOrder: (order: string[]) => void;
  addProjectTab: (projectId: string) => void;
  removeProjectTab: (projectId: string) => void;
  setPanelLayout: (layout: Layout) => void;
  hydrate: (state: {
    openProjectTabs: string[];
    activeProjectId: string | null;
    lastRoutePerProject: Record<string, string>;
    sidebarCollapsed: boolean;
    layoutPreset: string;
  }) => void;
  clearLayout: () => void;
}

// ── Debounced persistence ──────────────────────────────────────

let hydrated = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function persistLayout() {
  if (!hydrated) return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const { sidebarCollapsed, layoutPreset, activeProjectId, projectTabOrder } =
      useLayoutStore.getState();
    void ipc(SETTINGS.SAVE.LAYOUT, {
      sidebarCollapsed,
      layoutPreset,
      activeProjectId,
      openProjectTabs: projectTabOrder,
    });
  }, 500);
}

/** Derive individual layout values from a preset ID */
function deriveFromPreset(preset: LayoutPreset) {
  const config = getPresetConfig(preset);
  return {
    sidebarLayout: config.sidebar,
    toolbarStyle: config.toolbar,
    contentLayout: config.content,
  };
}

const defaultDerived = deriveFromPreset('default');

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  layoutPreset: 'default',
  activeProjectId: null,
  projectTabOrder: [],
  panelLayout: null,

  // Derived initial values
  sidebarLayout: defaultDerived.sidebarLayout,
  toolbarStyle: defaultDerived.toolbarStyle,
  contentLayout: defaultDerived.contentLayout,

  toggleSidebar: () => {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
    persistLayout();
  },
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    persistLayout();
  },
  setLayoutPreset: (preset) => {
    set({ layoutPreset: preset, ...deriveFromPreset(preset) });
    persistLayout();
  },

  setActiveProject: (projectId) => {
    set({ activeProjectId: projectId });
    persistLayout();
  },

  setProjectTabOrder: (order) => {
    set({ projectTabOrder: order });
    persistLayout();
  },

  addProjectTab: (projectId) => {
    set((s) => {
      if (s.projectTabOrder.includes(projectId)) return s;
      return {
        projectTabOrder: [...s.projectTabOrder, projectId],
        activeProjectId: projectId,
      };
    });
    persistLayout();
  },

  removeProjectTab: (projectId) => {
    set((s) => {
      const order = s.projectTabOrder.filter((id) => id !== projectId);
      return {
        projectTabOrder: order,
        activeProjectId:
          s.activeProjectId === projectId ? (order.at(-1) ?? null) : s.activeProjectId,
      };
    });
    persistLayout();
    void ipc(WORKSPACE.STOP.PROJECT, { projectId });
  },

  setPanelLayout: (layout) => set({ panelLayout: layout }),

  hydrate: (state) => {
    const preset = (state.layoutPreset === 'floating' ? 'floating' : 'default') as LayoutPreset;
    set({
      projectTabOrder: state.openProjectTabs,
      activeProjectId: state.activeProjectId,
      sidebarCollapsed: state.sidebarCollapsed,
      layoutPreset: preset,
      ...deriveFromPreset(preset),
    });
    hydrated = true;
  },

  clearLayout: () => {
    hydrated = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    set({
      sidebarCollapsed: false,
      layoutPreset: 'default',
      ...deriveFromPreset('default'),
      activeProjectId: null,
      projectTabOrder: [],
      panelLayout: null,
    });
  },
}));
```

- [ ] **Step 3: Update stores barrel export**

In `src/renderer/shared/stores/index.ts`, remove:
```typescript
export type { IconButtonShape } from './theme-store';
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/shared/stores/theme-store.ts src/renderer/shared/stores/layout-store.ts src/renderer/shared/stores/index.ts
git commit -m "refactor(stores): preset-based layout, remove icon button shape"
```

---

### Task 5: Backend Service + Defaults

**Files:**
- Modify: `src/main/features/settings/settings-service.ts`
- Modify: `src/main/features/settings/settings-defaults.ts`

- [ ] **Step 1: Update `settings-defaults.ts`**

Remove `iconButtonShape` from `DEFAULT_SETTINGS`. Remove `sidebarLayout` if present (it's not in the current defaults, but check). Add `layoutPreset`:

Replace the `DEFAULT_SETTINGS` constant:

```typescript
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  colorTheme: 'default',
  customThemes: [],
  language: 'en',
  uiScale: 100,
  layoutPreset: 'default',
  onboardingCompleted: false,
  agentSettings: DEFAULT_AGENT_SETTINGS,
  assistantAutoStart: true,
  openProjectTabs: [],
  activeProjectId: null,
  lastRoutePerProject: {},
  sidebarCollapsed: false,
  layoutGap: 8,
};
```

- [ ] **Step 2: Update `settings-service.ts`**

Replace the `LayoutState` and `LayoutUpdate` interfaces:

```typescript
export interface LayoutState {
  openProjectTabs: string[];
  activeProjectId: string | null;
  lastRoutePerProject: Record<string, string>;
  sidebarCollapsed: boolean;
  layoutPreset: string;
}

export interface LayoutUpdate {
  openProjectTabs?: string[];
  activeProjectId?: string | null;
  lastRoutePerProject?: Record<string, string>;
  sidebarCollapsed?: boolean;
  layoutPreset?: string;
}
```

Replace the `getLayout()` method body:

```typescript
    getLayout() {
      // Migration: map legacy individual fields to nearest preset
      const legacy = store.settings as Record<string, unknown>;
      let preset = (store.settings.layoutPreset as string | undefined) ?? 'default';
      if (!store.settings.layoutPreset) {
        // Migrate from old individual fields
        if (legacy.toolbarStyle === 'floating' || legacy.sidebarLayout === 'sidebar-04') {
          preset = 'floating';
        }
      }
      return {
        openProjectTabs: store.settings.openProjectTabs ?? [],
        activeProjectId: store.settings.activeProjectId ?? null,
        lastRoutePerProject: store.settings.lastRoutePerProject ?? {},
        sidebarCollapsed: store.settings.sidebarCollapsed ?? false,
        layoutPreset: preset,
      };
    },
```

Replace the `saveLayout()` method body:

```typescript
    saveLayout(updates) {
      if (updates.openProjectTabs !== undefined) {
        store.settings.openProjectTabs = updates.openProjectTabs;
      }
      if (updates.activeProjectId !== undefined) {
        store.settings.activeProjectId = updates.activeProjectId;
      }
      if (updates.lastRoutePerProject !== undefined) {
        store.settings.lastRoutePerProject = updates.lastRoutePerProject;
      }
      if (updates.sidebarCollapsed !== undefined) {
        store.settings.sidebarCollapsed = updates.sidebarCollapsed;
      }
      if (updates.layoutPreset !== undefined) {
        store.settings.layoutPreset = updates.layoutPreset as AppSettings['layoutPreset'];
      }
      persist();
      return { success: true };
    },
```

- [ ] **Step 3: Commit**

```bash
git add src/main/features/settings/settings-service.ts src/main/features/settings/settings-defaults.ts
git commit -m "refactor(settings): preset-based layout persistence with legacy migration"
```

---

### Task 6: Renderer UI — LayoutSection + useSettings Hook

**Files:**
- Modify: `src/renderer/features/settings/components/LayoutSection.tsx`
- Modify: `src/renderer/features/settings/api/useSettings.ts`

- [ ] **Step 1: Update `useSettings.ts`**

Replace the full file:

```typescript
/**
 * React Query hooks for settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { SETTINGS } from '@shared/ipc/settings/channels';
import type { LayoutPreset } from '@shared/types/layout';

import { ipc } from '@renderer/shared/lib/ipc';
import { useLayoutStore, useThemeStore } from '@renderer/shared/stores';


export const settingsKeys = {
  all: ['settings'] as const,
  app: () => [...settingsKeys.all, 'app'] as const,
  agentSettings: () => [...settingsKeys.all, 'agentSettings'] as const,
  profiles: () => [...settingsKeys.all, 'profiles'] as const,
  webhookConfig: () => [...settingsKeys.all, 'webhookConfig'] as const,
};

/** Fetch app settings */
export function useSettings() {
  const { setMode, setColorTheme, setUiScale, setCustomThemes, setLayoutGap } = useThemeStore();
  const { setLayoutPreset } = useLayoutStore();

  return useQuery({
    queryKey: settingsKeys.app(),
    queryFn: async () => {
      const settings = await ipc(SETTINGS.GET.ALL, {});
      // Sync theme store on load
      setCustomThemes(settings.customThemes ?? []);
      setMode(settings.theme);
      setColorTheme(settings.colorTheme);
      setUiScale(settings.uiScale);
      if (settings.layoutPreset) {
        setLayoutPreset(settings.layoutPreset as LayoutPreset);
      }
      if (settings.layoutGap !== undefined) setLayoutGap(settings.layoutGap);
      if (settings.fontFamily) {
        document.documentElement.style.setProperty('--app-font-sans', settings.fontFamily);
      }
      if (settings.fontSize !== undefined) {
        document.documentElement.style.setProperty(
          '--app-font-size',
          `${String(settings.fontSize)}px`,
        );
      }
      return settings;
    },
    staleTime: 60_000,
  });
}

/** Update settings */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, unknown>) => ipc(SETTINGS.UPDATE.ALL, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.app(), data);
    },
  });
}

/** Fetch API profiles */
export function useProfiles() {
  return useQuery({
    queryKey: settingsKeys.profiles(),
    queryFn: () => ipc(SETTINGS.GET.PROFILES, {}),
    staleTime: 60_000,
  });
}

/** Create a new profile */
export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; apiKey?: string; model?: string }) =>
      ipc(SETTINGS.CREATE.PROFILE, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Update an existing profile */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      updates: { name?: string; apiKey?: string; model?: string };
    }) => ipc(SETTINGS.UPDATE.PROFILE, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Delete a profile */
export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(SETTINGS.DELETE.PROFILE, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Set a profile as the default */
export function useSetDefaultProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(SETTINGS.SET['DEFAULT-PROFILE'], { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.profiles() });
    },
  });
}

/** Fetch agent settings (maxConcurrentAgents) */
export function useAgentSettings() {
  return useQuery({
    queryKey: settingsKeys.agentSettings(),
    queryFn: () => ipc(SETTINGS.GET['AGENT-SETTINGS'], {}),
    staleTime: 60_000,
  });
}

/** Update agent settings */
export function useUpdateAgentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { maxConcurrentAgents: number }) =>
      ipc(SETTINGS.SET['AGENT-SETTINGS'], data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.agentSettings() });
    },
  });
}
```

- [ ] **Step 2: Rewrite `LayoutSection.tsx`**

Replace the entire file:

```tsx
/**
 * LayoutSection — Layout settings for Settings > Display
 *
 * Simplified preset-based layout:
 *   ┌─────────────────┬─────────────────────┐
 *   │  Layout preset   │  Color theme + edit │
 *   ├─────────────────┴─────────────────────┤
 *   │         Unified SVG preview            │
 *   │         + color legend                 │
 *   └───────────────────────────────────────┘
 */

import { useNavigate } from '@tanstack/react-router';
import { Check, Settings2 } from 'lucide-react';

import { ROUTES } from '@shared/constants';
import type { LayoutPreset } from '@shared/types/layout';
import { LAYOUT_PRESETS, getPresetConfig } from '@shared/types/layout';

import { useLayoutStore } from '@renderer/shared/stores';
import { useThemeStore } from '@renderer/shared/stores';

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ui';

import { useUpdateSettings } from '../api/useSettings';

// ── SVG tint colors ────────────────────────────────────────

const SIDEBAR_TINT = 'oklch(0.65 0.15 230 / 0.12)';
const TOOLBAR_TINT = 'oklch(0.70 0.10 50 / 0.12)';
const CONTENT_TINT = 'oklch(0.75 0.12 170 / 0.10)';

// ── SVG Preview ────────────────────────────────────────────

function LayoutPreview({ preset }: { preset: LayoutPreset }) {
  const config = getPresetConfig(preset);
  const w = 320;
  const h = 160;
  const isFloating = preset === 'floating';
  const pad = isFloating ? 4 : 0;
  const gap = 3;
  const sidebarW = isFloating ? 55 : 20;
  const headerH = isFloating ? 14 : 16;
  const contentX = sidebarW + gap;
  const contentW = w - sidebarW - gap;
  const floatingRx = isFloating ? 4 : 0;

  const isBordered = config.content === 'bordered';
  const contentInset = isBordered ? 5 : 0;
  const innerX = contentX + contentInset;
  const innerY = headerH + contentInset;
  const innerW = contentW - contentInset * 2;
  const innerH = h - headerH - contentInset * 2;

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${String(w)} ${String(h)}`}>
      <rect className="fill-muted/20" height={h} rx={6} width={w} x={0} y={0} />

      {/* Sidebar tint */}
      <rect fill={SIDEBAR_TINT} height={h - pad * 2} rx={floatingRx} width={sidebarW - pad} x={pad} y={pad} />

      {/* Toolbar tint */}
      <rect fill={TOOLBAR_TINT} height={headerH} width={contentW} x={contentX} y={0} />

      {/* Content tint */}
      <rect fill={CONTENT_TINT} height={h - headerH} width={contentW} x={contentX} y={headerH} />

      {/* Sidebar border */}
      <rect className="stroke-border" fill="none" height={h - pad * 2} rx={floatingRx} strokeWidth={0.5} width={sidebarW - pad} x={pad} y={pad} />

      {/* Sidebar detail */}
      {isFloating ? (
        /* Floating: collapsible group sections */
        <>
          <rect className="fill-muted-foreground/20" height={3} rx={1} width={sidebarW - pad - 16} x={pad + 8} y={pad + 24} />
          {Array.from({ length: 3 }).map((_, j) => (
            <rect key={`s1-${String(j)}`} className="fill-muted-foreground/10" height={3} rx={1} width={sidebarW - pad - 20} x={pad + 10} y={pad + 32 + j * 7} />
          ))}
          <rect className="fill-muted-foreground/20" height={3} rx={1} width={sidebarW - pad - 16} x={pad + 8} y={pad + 65} />
          {Array.from({ length: 3 }).map((_, j) => (
            <rect key={`s2-${String(j)}`} className="fill-muted-foreground/10" height={3} rx={1} width={sidebarW - pad - 20} x={pad + 10} y={pad + 73 + j * 7} />
          ))}
        </>
      ) : (
        /* Default: icon collapse icons */
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={`icon-${String(i)}`} className="fill-muted-foreground/25" height={5} rx={1} width={5} x={pad + 7} y={pad + 24 + i * 14} />
          ))}
        </>
      )}

      {/* Toolbar detail */}
      <rect className="fill-muted-foreground/15" height={Math.max(headerH - 8, 4)} rx={2} width={30} x={contentX + 6} y={4} />
      <rect className="fill-muted-foreground/10" height={Math.max(headerH - 8, 4)} rx={2} width={20} x={contentX + contentW - 30} y={4} />

      {/* Content border (bordered layout only) */}
      {isBordered ? (
        <rect className="stroke-border" fill="none" height={innerH} rx={4} strokeWidth={0.5} width={innerW} x={innerX} y={innerY} />
      ) : null}

      {/* Content lines */}
      {Array.from({ length: 5 }).map((_, i) => (
        <rect
          key={`line-${String(i)}`}
          className="fill-muted-foreground/10"
          height={5}
          rx={2}
          width={(innerW - 20) * (i === 4 ? 0.5 : 0.9 - i * 0.08)}
          x={innerX + 10}
          y={innerY + 10 + i * 12}
        />
      ))}

      <rect className="stroke-border" fill="none" height={h} rx={6} strokeWidth={0.5} width={w} x={0} y={0} />
    </svg>
  );
}

// ── Main Section ───────────────────────────────────────────

export function LayoutSection() {
  const { layoutPreset, setLayoutPreset } = useLayoutStore();
  const { colorTheme, setColorTheme, customThemes } = useThemeStore();
  const updateSettings = useUpdateSettings();
  const navigate = useNavigate();

  function handlePresetChange(value: string) {
    const preset = value as LayoutPreset;
    setLayoutPreset(preset);
    updateSettings.mutate({ layoutPreset: preset });
  }

  function handleThemeChange(value: string) {
    setColorTheme(value);
    updateSettings.mutate({ colorTheme: value });
  }

  function handleCustomizeTheme() {
    void navigate({ to: ROUTES.THEMES as '/' });
  }

  const selectedPreset = LAYOUT_PRESETS.find((p) => p.id === layoutPreset);

  return (
    <section className="mb-8">
      <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
        Layout
      </h2>

      <div className="border-border overflow-hidden rounded-lg border">
        {/* Top row: preset + theme */}
        <div className="grid grid-cols-2">
          {/* Layout Preset */}
          <div className="border-border space-y-3 border-r p-4">
            <Text className="text-foreground text-sm font-medium">Layout</Text>
            <div className="flex flex-col gap-3">
              <Label htmlFor="layout-preset">Preset</Label>
              <Select value={layoutPreset} onValueChange={handlePresetChange}>
                <SelectTrigger id="layout-preset">
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUT_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPreset ? (
                <Text className="text-xs" variant="muted">{selectedPreset.description}</Text>
              ) : null}
            </div>
          </div>

          {/* Color Theme */}
          <div className="space-y-3 p-4">
            <Text className="text-foreground text-sm font-medium">Theme</Text>
            <div className="flex flex-col gap-3">
              <Label htmlFor="color-theme">Color Theme</Label>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Select value={colorTheme} onValueChange={handleThemeChange}>
                    <SelectTrigger id="color-theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        <span className="flex items-center gap-2">
                          Default
                          {colorTheme === 'default' ? <Check className="text-success h-3 w-3" /> : null}
                        </span>
                      </SelectItem>
                      {customThemes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            {t.name}
                            {colorTheme === t.id ? <Check className="text-success h-3 w-3" /> : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" onClick={handleCustomizeTheme}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit themes</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: SVG preview */}
        <div className="border-border border-t p-4">
          <div className="h-[90px] w-full">
            <LayoutPreview preset={layoutPreset} />
          </div>
          <div className="mt-2 flex justify-center gap-4">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: SIDEBAR_TINT }} />
              <Text className="text-[9px]" variant="muted">Sidebar</Text>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: TOOLBAR_TINT }} />
              <Text className="text-[9px]" variant="muted">Toolbar</Text>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: CONTENT_TINT }} />
              <Text className="text-[9px]" variant="muted">Content</Text>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/features/settings/components/LayoutSection.tsx src/renderer/features/settings/api/useSettings.ts
git commit -m "refactor(settings-ui): preset-based LayoutSection, remove individual selectors"
```

---

### Task 7: TopBar + ContentAreaContainer Cleanup

**Files:**
- Modify: `src/renderer/app/layouts/TopBar.tsx`
- Modify: `src/renderer/app/layouts/ContentAreaContainer.tsx`

- [ ] **Step 1: Clean up TopBar toolbar classes**

In `src/renderer/app/layouts/TopBar.tsx`, replace the `TOOLBAR_CLASSES` record (lines 34-43):

```typescript
const TOOLBAR_CLASSES: Record<ToolbarStyleId, string> = {
  default: 'h-10 bg-card border border-border',
  floating: 'h-9 bg-card/90 border border-border rounded-lg shadow-sm [&_.electron-no-drag_button]:rounded-md',
};
```

The `[&_.electron-no-drag_button]:rounded-md` selector ensures icon buttons inside the floating toolbar inherit rounded hover states.

- [ ] **Step 2: Clean up ContentAreaContainer styles**

In `src/renderer/app/layouts/ContentAreaContainer.tsx`, replace the style maps (lines 22-35):

```typescript
/** Applied to the root container — insets both toolbar and content equally */
const CONTAINER_STYLE: Record<ContentLayoutId, string> = {
  flush: '',
  bordered: 'p-[var(--layout-gap)] gap-[var(--layout-gap)]',
};

/** Applied to the inner content wrapper — decoration only */
const INNER_STYLE: Record<ContentLayoutId, string> = {
  flush: '',
  bordered: 'border-border rounded-lg border',
};
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/app/layouts/TopBar.tsx src/renderer/app/layouts/ContentAreaContainer.tsx
git commit -m "refactor(layout): remove unused toolbar/content styles, fix floating button rounding"
```

---

### Task 8: Typecheck + Lint + Verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If there are errors, fix them — likely stale references to removed types (`IconButtonShape`, old `SidebarLayoutId` variants, `toolbarStyle`/`contentLayout`/`sidebarLayout` on old interfaces).

- [ ] **Step 2: Lint changed files**

```bash
npx eslint src/shared/types/layout.ts src/shared/types/settings.ts src/shared/ipc/settings/schemas.ts src/renderer/shared/stores/theme-store.ts src/renderer/shared/stores/layout-store.ts src/renderer/shared/stores/index.ts src/main/features/settings/settings-service.ts src/main/features/settings/settings-defaults.ts src/renderer/features/settings/components/LayoutSection.tsx src/renderer/features/settings/api/useSettings.ts src/renderer/app/layouts/TopBar.tsx src/renderer/app/layouts/ContentAreaContainer.tsx src/renderer/app/layouts/sidebar-layouts/layout-configs.ts
```

Expected: 0 errors, 0 warnings. Fix any issues.

- [ ] **Step 3: Grep for stale references**

Search for any remaining references to removed concepts:

```bash
# Should return 0 results in src/ (docs are OK)
grep -rn "iconButtonShape\|setIconButtonShape\|IconButtonShape" src/
grep -rn "'sidebar-01'\|'sidebar-02'\|'sidebar-03'\|'sidebar-05'\|'sidebar-06'" src/
grep -rn "'compact'\|'spacious'\|'glass'\|'minimal'\|'inset'" src/shared/types/ src/renderer/app/layouts/TopBar.tsx
grep -rn "'padded'\|'inset'" src/shared/types/ src/renderer/app/layouts/ContentAreaContainer.tsx
```

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve typecheck/lint issues from layout preset migration"
```
