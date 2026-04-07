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
  layoutDirection: 'TB' | 'LR';
  searchFilter: string;
  showEdgeLabels: boolean;
  toggleCodebaseLayer: () => void;
  toggleAgentLayer: () => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedFeature: (feature: string | null) => void;
  openDetailPanel: (nodeId: string) => void;
  closeDetailPanel: () => void;
  toggleExpandedGroup: (groupId: string) => void;
  setLayoutDirection: (dir: 'TB' | 'LR') => void;
  setSearchFilter: (s: string) => void;
  toggleEdgeLabels: () => void;
}

export const useVisualizationStore = create<VisualizationState>()((set) => ({
  showCodebaseLayer: true,
  showAgentLayer: true,
  detailPanelOpen: false,
  selectedNodeId: null,
  selectedFeature: null,
  expandedGroups: new Set<string>(),
  layoutDirection: 'TB' as const,
  searchFilter: '',
  showEdgeLabels: false,

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

  setLayoutDirection: (dir) => set({ layoutDirection: dir }),

  setSearchFilter: (s) => set({ searchFilter: s }),

  toggleEdgeLabels: () =>
    set((state) => ({ showEdgeLabels: !state.showEdgeLabels })),
}));
