/**
 * useNotesList — logic for NotesList
 */

import { useCreateNote, useNotes, useSearchNotes } from '../../api/useNotes';
import { useNotesUI } from '../../store';

export function useNotesList() {
  const { selectedNoteId, searchQuery, selectedTag, selectNote, setSearchQuery, setSelectedTag } =
    useNotesUI();

  const createNote = useCreateNote();

  const { data: allNotes } = useNotes(undefined, selectedTag ?? undefined);
  const { data: searchResults } = useSearchNotes(searchQuery);

  const notes = searchQuery.length > 0 ? searchResults : allNotes;
  const displayNotes = notes ?? [];

  const allTags = [...new Set((allNotes ?? []).flatMap((n) => n.tags))].sort();

  function handleCreateNote() {
    createNote.mutate(
      { title: 'Untitled Note', content: '' },
      {
        onSuccess: (newNote) => {
          selectNote(newNote.id);
        },
      },
    );
  }

  function handleTagClick(tag: string) {
    setSelectedTag(selectedTag === tag ? null : tag);
  }

  return {
    selectedNoteId,
    searchQuery,
    selectedTag,
    displayNotes,
    allTags,
    selectNote,
    setSearchQuery,
    handleCreateNote,
    handleTagClick,
  };
}
