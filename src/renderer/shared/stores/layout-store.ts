/**
 * Layout Store — Global layout/navigation state
 *
 * Sidebar collapsed state, active project, panel layout, etc.
 * Everything that affects the app shell but isn't feature-specific.
 */

import { create } from 'zustand';

import type { SidebarLayoutId } from '@shared/types/layout';

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
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  sidebarLayout: 'sidebar-07',
  activeProjectId: null,
  projectTabOrder: [],
  panelLayout: null,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarLayout: (id) => set({ sidebarLayout: id }),

  setActiveProject: (projectId) => set({ activeProjectId: projectId }),

  setProjectTabOrder: (order) => set({ projectTabOrder: order }),

  addProjectTab: (projectId) =>
    set((s) => {
      if (s.projectTabOrder.includes(projectId)) return s;
      return {
        projectTabOrder: [...s.projectTabOrder, projectId],
        activeProjectId: projectId,
      };
    }),

  removeProjectTab: (projectId) =>
    set((s) => {
      const order = s.projectTabOrder.filter((id) => id !== projectId);
      return {
        projectTabOrder: order,
        activeProjectId:
          s.activeProjectId === projectId ? (order.at(-1) ?? null) : s.activeProjectId,
      };
    }),

  setPanelLayout: (layout) => set({ panelLayout: layout }),
}));
