/**
 * Workflow UI Store — tracks active watchers and sessions
 */

import { create } from 'zustand';

interface WorkflowUIState {
  activeWatchers: Record<string, boolean>;
  activeSessions: Record<string, string>;
  addWatcher: (projectPath: string) => void;
  removeWatcher: (projectPath: string) => void;
  addSession: (sessionId: string, taskId: string) => void;
  removeSession: (sessionId: string) => void;
}

export const useWorkflowStore = create<WorkflowUIState>()((set) => ({
  activeWatchers: {},
  activeSessions: {},

  addWatcher: (projectPath) =>
    set((state) => ({
      activeWatchers: { ...state.activeWatchers, [projectPath]: true },
    })),

  removeWatcher: (projectPath) =>
    set((state) => {
      const { [projectPath]: _, ...rest } = state.activeWatchers;
      return { activeWatchers: rest };
    }),

  addSession: (sessionId, taskId) =>
    set((state) => ({
      activeSessions: { ...state.activeSessions, [sessionId]: taskId },
    })),

  removeSession: (sessionId) =>
    set((state) => {
      const { [sessionId]: _, ...rest } = state.activeSessions;
      return { activeSessions: rest };
    }),
}));
