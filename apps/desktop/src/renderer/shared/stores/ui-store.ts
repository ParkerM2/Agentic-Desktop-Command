/**
 * UI Store — Global UI-only state
 *
 * Thin store for app-wide UI state that doesn't come from main process.
 * Theme, sidebar collapsed, active project tab, etc.
 */
import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  activeProjectId: null,
  setActiveProject: (id) => set({ activeProjectId: id }),
}));
