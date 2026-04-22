/**
 * useNoteEditor — logic for NoteEditor
 */

import { useCallback, useEffect, useState } from 'react';

import type { Note } from '@shared/types';

import { useDeleteNote, useUpdateNote } from '../../api/useNotes';
import { useNotesUI } from '../../store';

export function useNoteEditor(note: Note) {
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const { selectNote } = useNotesUI();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagsInput, setTagsInput] = useState(note.tags.join(', '));

  // Sync local state when the selected note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTagsInput(note.tags.join(', '));
  }, [note.id, note.title, note.content, note.tags]);

  const handleSave = useCallback(() => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    updateNote.mutate({
      id: note.id,
      title,
      content,
      tags,
    });
  }, [note.id, title, content, tagsInput, updateNote]);

  function handleDelete() {
    deleteNote.mutate(note.id);
    selectNote(null);
  }

  function handleTogglePin() {
    updateNote.mutate({ id: note.id, pinned: !note.pinned });
  }

  function handleClose() {
    selectNote(null);
  }

  const hasChanges =
    title !== note.title || content !== note.content || tagsInput !== note.tags.join(', ');

  return {
    title,
    content,
    tagsInput,
    hasChanges,
    setTitle,
    setContent,
    setTagsInput,
    handleSave,
    handleDelete,
    handleTogglePin,
    handleClose,
  };
}
