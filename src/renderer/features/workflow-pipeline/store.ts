/**
 * Workflow Pipeline UI Store — tracks selected and editing pipeline steps
 */

import { create } from 'zustand';

interface WorkflowPipelineState {
  selectedStep: string | null;
  editingStep: string | null;
  setSelectedStep: (step: string | null) => void;
  setEditingStep: (step: string | null) => void;
  clearEditing: () => void;
}

export const useWorkflowPipelineStore = create<WorkflowPipelineState>()((set) => ({
  selectedStep: null,
  editingStep: null,

  setSelectedStep: (step) => set({ selectedStep: step }),

  setEditingStep: (step) => set({ editingStep: step }),

  clearEditing: () => set({ editingStep: null }),
}));
