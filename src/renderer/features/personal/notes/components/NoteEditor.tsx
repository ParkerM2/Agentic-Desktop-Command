/**
 * NoteEditor — Title + content textarea for editing a note
 */

import { useCallback, useEffect, useState } from 'react';

import { Pin, PinOff, Save, Trash2, X } from 'lucide-react';

import type { Note } from '@shared/types';

import { Button, Input, Textarea } from '@ui';

import { useDeleteNote, useUpdateNote } from '../api/useNotes';
import { useNotesUI } from '../store';

// ── Types ────────────────────────────────────────────────────

interface NoteEditorProps {
  note: Note;
}

// ── Component ────────────────────────────────────────────────

export function NoteEditor({ note }: NoteEditorProps) {
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

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="border-border flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            className={note.pinned ? 'text-primary' : 'text-muted-foreground'}
            size="icon"
            variant="ghost"
            onClick={handleTogglePin}
          >
            {note.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
          </Button>
          <Button
            aria-label="Save note"
            className={hasChanges ? 'text-primary' : 'text-muted-foreground'}
            disabled={!hasChanges}
            size="icon"
            variant="ghost"
            onClick={handleSave}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Delete note"
            className="text-muted-foreground hover:text-destructive"
            size="icon"
            variant="ghost"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Close editor"
            size="icon"
            variant="ghost"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="border-border border-b px-4 py-3">
        <Input
          aria-label="Note title"
          className="border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Tags */}
      <div className="border-border border-b px-4 py-2">
        <Input
          aria-label="Tags (comma separated)"
          className="border-none bg-transparent text-muted-foreground shadow-none focus-visible:ring-0"
          placeholder="Tags (comma separated)..."
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <Textarea
          aria-label="Note content"
          className="h-full resize-none border-none bg-transparent shadow-none focus-visible:ring-0"
          placeholder="Write your note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="border-border text-muted-foreground border-t px-4 py-2 text-xs">
        Updated {new Date(note.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
