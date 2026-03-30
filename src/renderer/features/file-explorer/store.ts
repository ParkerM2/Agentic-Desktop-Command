/**
 * File Explorer UI Store -- Client-side state only
 *
 * Tracks expanded nodes, selected node, and search filter.
 * No data from main process lives here.
 */

import { create } from 'zustand';

interface FileExplorerUIState {
  /** Set of expanded node IDs */
  expandedNodes: Set<string>;
  /** Currently selected file path */
  selectedNode: string | null;
  /** Filter/search query within tree */
  searchQuery: string;

  toggleExpanded: (id: string) => void;
  setExpanded: (id: string, open: boolean) => void;
  selectNode: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;
}

export const useFileExplorerUI = create<FileExplorerUIState>((set) => ({
  expandedNodes: new Set<string>(),
  selectedNode: null,
  searchQuery: '',

  toggleExpanded: (id) =>
    set((s) => {
      const next = new Set(s.expandedNodes);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { expandedNodes: next };
    }),

  setExpanded: (id, open) =>
    set((s) => {
      const next = new Set(s.expandedNodes);
      if (open) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { expandedNodes: next };
    }),

  selectNode: (id) => set({ selectedNode: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearSearch: () => set({ searchQuery: '' }),

  expandAll: (ids) =>
    set(() => ({
      expandedNodes: new Set(ids),
    })),

  collapseAll: () => set({ expandedNodes: new Set<string>() }),
}));
