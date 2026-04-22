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
