/**
 * useNotesPage — logic for NotesPage
 */

import { useNotes } from '../../api/useNotes';
import { useNoteEvents } from '../../hooks/useNoteEvents';
import { useNotesUI } from '../../store';

export function useNotesPage() {
  const { selectedNoteId } = useNotesUI();
  const { data: notes, isLoading } = useNotes();

  // Subscribe to real-time note events
  useNoteEvents();

  const selectedNote = (notes ?? []).find((n) => n.id === selectedNoteId);

  return {
    isLoading,
    selectedNote,
  };
}
