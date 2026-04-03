/**
 * Workspace Store — ephemeral view state for the workspace feature
 */

import { create } from 'zustand';

interface WorkspaceStore {
  viewingProjectId: string | null;
  teamLeadCollapsed: Record<string, boolean>;
  inputDrafts: Record<string, string>;

  setViewingProject: (projectId: string | null) => void;
  toggleTeamLeadCollapsed: (sessionId: string) => void;
  setInputDraft: (sessionId: string, draft: string) => void;
  clearInputDraft: (sessionId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  viewingProjectId: null,
  teamLeadCollapsed: {},
  inputDrafts: {},

  setViewingProject(projectId) {
    set({ viewingProjectId: projectId });
  },

  toggleTeamLeadCollapsed(sessionId) {
    set((state) => ({
      teamLeadCollapsed: {
        ...state.teamLeadCollapsed,
        [sessionId]: !state.teamLeadCollapsed[sessionId],
      },
    }));
  },

  setInputDraft(sessionId, draft) {
    set((state) => ({
      inputDrafts: { ...state.inputDrafts, [sessionId]: draft },
    }));
  },

  clearInputDraft(sessionId) {
    set((state) => {
      const { [sessionId]: _removed, ...rest } = state.inputDrafts;
      return { inputDrafts: rest };
    });
  },
}));
