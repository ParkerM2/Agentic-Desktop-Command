/**
 * NotesList — Filterable, searchable notes list
 */

import { Pin } from 'lucide-react';

import type { Note } from '@shared/types';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';
import { cn } from '@renderer/shared/lib/utils';

import { Button, ScrollArea, SearchInput } from '@ui';

import { useCreateNote, useNotes, useSearchNotes } from '../api/useNotes';
import { useNotesUI } from '../store';

// ── Component ────────────────────────────────────────────────

export function NotesList() {
  const { selectedNoteId, searchQuery, selectedTag, selectNote, setSearchQuery, setSelectedTag } =
    useNotesUI();

  const createNote = useCreateNote();

  const { data: allNotes } = useNotes(undefined, selectedTag ?? undefined);
  const { data: searchResults } = useSearchNotes(searchQuery);

  const notes = searchQuery.length > 0 ? searchResults : allNotes;
  const displayNotes = notes ?? [];

  // Collect all unique tags across notes
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

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-border border-b px-3 py-2">
        <SearchInput
          aria-label="Search notes"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tags filter */}
      {allTags.length > 0 ? (
        <div className="border-border flex flex-wrap gap-1.5 border-b px-3 py-2">
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant="ghost"
              className={cn(
                'h-auto rounded-full px-2 py-0.5 text-xs',
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground hover:bg-accent',
              )}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      ) : null}

      {/* New note button */}
      <div className="border-border border-b px-3 py-2">
        <Button className="w-full" onClick={handleCreateNote}>
          New Note
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1">
        {displayNotes.length === 0 ? (
          <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
            {searchQuery.length > 0 ? 'No notes found' : 'No notes yet'}
          </div>
        ) : (
          <div className="divide-border divide-y">
            {displayNotes.map((note) => (
              <NoteListItem
                key={note.id}
                isSelected={selectedNoteId === note.id}
                note={note}
                onSelect={() => selectNote(note.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── NoteListItem ─────────────────────────────────────────────

interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
}

function NoteListItem({ note, isSelected, onSelect }: NoteListItemProps) {
  const preview = note.content.length > 80 ? `${note.content.slice(0, 80)}...` : note.content;

  return (
    <Button
      variant="ghost"
      className={cn(
        'h-auto w-full justify-start px-3 py-3 text-left',
        isSelected ? 'bg-accent border-primary border-l-2' : 'border-l-2 border-transparent',
      )}
      onClick={onSelect}
    >
      <div className="w-full">
        <div className="flex items-start justify-between gap-2">
          <span className="text-foreground text-sm leading-tight font-medium">{note.title}</span>
          {note.pinned ? <Pin className="text-primary h-3 w-3 shrink-0" /> : null}
        </div>
        {preview.length > 0 ? (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{preview}</p>
        ) : null}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>
          <RelativeTime value={note.createdAt} />
          {note.tags.length > 0 ? (
            <div className="flex gap-1">
              {note.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="bg-muted text-muted-foreground rounded px-1 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Button>
  );
}
