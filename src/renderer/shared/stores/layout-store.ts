/**
 * Layout Store — Global layout/navigation state
 *
 * Sidebar collapsed state, active project, etc.
 * Everything that affects the app shell but isn't feature-specific.
 */

import { create } from 'zustand';

interface LayoutState {
  sidebarCollapsed: boolean;
  activeProjectId: string | null;
  projectTabOrder: string[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveProject: (projectId: string | null) => void;
  setProjectTabOrder: (order: string[]) => void;
  addProjectTab: (projectId: string) => void;
  removeProjectTab: (projectId: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  activeProjectId: null,
  projectTabOrder: [],

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

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
}));
