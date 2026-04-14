/**
 * Diff Viewer UI Store — Client-side state only
 *
 * View mode, selected file, and context expansion preferences.
 * No data from main process lives here.
 */

import { create } from 'zustand';

type DiffViewMode = 'split' | 'unified';

interface DiffViewerUIState {
  viewMode: DiffViewMode;
  selectedFile: string | null;
  expandedContext: boolean;

  setViewMode: (mode: DiffViewMode) => void;
  selectFile: (file: string | null) => void;
  setExpandedContext: (expanded: boolean) => void;
  toggleExpandedContext: () => void;
}

export const useDiffViewerUI = create<DiffViewerUIState>((set) => ({
  viewMode: 'split',
  selectedFile: null,
  expandedContext: false,

  setViewMode: (viewMode) => set({ viewMode }),
  selectFile: (selectedFile) => set({ selectedFile }),
  setExpandedContext: (expandedContext) => set({ expandedContext }),
  toggleExpandedContext: () => set((s) => ({ expandedContext: !s.expandedContext })),
}));

export type { DiffViewMode };
