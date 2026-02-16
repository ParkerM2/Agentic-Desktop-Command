/**
 * Workspace UI Store — persists active workspace ID to localStorage
 */

import { create } from 'zustand';

const STORAGE_KEY = 'adc-workspace';

function loadPersistedWorkspaceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface WorkspaceUIState {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceUIState>()((set) => ({
  activeWorkspaceId: loadPersistedWorkspaceId(),

  setActiveWorkspaceId: (id) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ activeWorkspaceId: id });
  },
}));
