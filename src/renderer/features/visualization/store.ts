/**
 * Visualization Canvas UI Store — tracks layer visibility, selection, and panel state
 */

import { create } from 'zustand';

interface VisualizationState {
  showCodebaseLayer: boolean;
  showAgentLayer: boolean;
  detailPanelOpen: boolean;
  selectedNodeId: string | null;
  selectedFeature: string | null;
  expandedGroups: Set<string>;
  toggleCodebaseLayer: () => void;
  toggleAgentLayer: () => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedFeature: (feature: string | null) => void;
  openDetailPanel: (nodeId: string) => void;
  closeDetailPanel: () => void;
  toggleExpandedGroup: (groupId: string) => void;
}

export const useVisualizationStore = create<VisualizationState>()((set) => ({
  showCodebaseLayer: true,
  showAgentLayer: true,
  detailPanelOpen: false,
  selectedNodeId: null,
  selectedFeature: null,
  expandedGroups: new Set<string>(),

  toggleCodebaseLayer: () =>
    set((state) => ({ showCodebaseLayer: !state.showCodebaseLayer })),

  toggleAgentLayer: () =>
    set((state) => ({ showAgentLayer: !state.showAgentLayer })),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setSelectedFeature: (feature) => set({ selectedFeature: feature }),

  openDetailPanel: (nodeId) => set({ detailPanelOpen: true, selectedNodeId: nodeId }),

  closeDetailPanel: () => set({ detailPanelOpen: false }),

  toggleExpandedGroup: (groupId) =>
    set((state) => {
      const next = new Set(state.expandedGroups);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return { expandedGroups: next };
    }),
}));
