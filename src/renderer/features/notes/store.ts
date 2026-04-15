/**
 * Notes UI state store
 */

import { create } from 'zustand';

interface NotesUIState {
  selectedNoteId: string | null;
  isEditing: boolean;
  searchQuery: string;
  selectedTag: string | null;
  selectNote: (id: string | null) => void;
  setEditing: (editing: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
}

export const useNotesUI = create<NotesUIState>()((set) => ({
  selectedNoteId: null,
  isEditing: false,
  searchQuery: '',
  selectedTag: null,
  selectNote: (id) => set({ selectedNoteId: id, isEditing: false }),
  setEditing: (editing) => set({ isEditing: editing }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
}));
