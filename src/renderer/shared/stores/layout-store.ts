/**
 * Layout Store — Global layout/navigation state
 *
 * Sidebar collapsed state, active project, panel layout, etc.
 * Everything that affects the app shell but isn't feature-specific.
 *
 * Persists layout state to settings.json via IPC with 500ms debounce.
 */

import { create } from 'zustand';

import { SETTINGS } from '@shared/ipc/settings/channels';
import type { SidebarLayoutId } from '@shared/types/layout';

import { ipc } from '@renderer/shared/lib/ipc';

import type { Layout } from 'react-resizable-panels';

interface LayoutState {
  sidebarCollapsed: boolean;
  sidebarLayout: SidebarLayoutId;
  activeProjectId: string | null;
  projectTabOrder: string[];
  panelLayout: Layout | null;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarLayout: (id: SidebarLayoutId) => void;
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
    sidebarLayout: string;
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
    const { sidebarCollapsed, sidebarLayout, activeProjectId, projectTabOrder } =
      useLayoutStore.getState();
    void ipc(SETTINGS.SAVE.LAYOUT, {
      sidebarCollapsed,
      sidebarLayout,
      activeProjectId,
      openProjectTabs: projectTabOrder,
    });
  }, 500);
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  sidebarLayout: 'sidebar-07',
  activeProjectId: null,
  projectTabOrder: [],
  panelLayout: null,

  toggleSidebar: () => {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
    persistLayout();
  },
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    persistLayout();
  },
  setSidebarLayout: (id) => {
    set({ sidebarLayout: id });
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
  },

  setPanelLayout: (layout) => set({ panelLayout: layout }),

  hydrate: (state) => {
    set({
      projectTabOrder: state.openProjectTabs,
      activeProjectId: state.activeProjectId,
      sidebarCollapsed: state.sidebarCollapsed,
      sidebarLayout: state.sidebarLayout as SidebarLayoutId,
    });
    hydrated = true;
  },

  clearLayout: () => {
    hydrated = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    set({
      sidebarCollapsed: false,
      sidebarLayout: 'sidebar-07',
      activeProjectId: null,
      projectTabOrder: [],
      panelLayout: null,
    });
  },
}));
