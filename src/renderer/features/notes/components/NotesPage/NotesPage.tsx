/**
 * NotesPage — Split view: list + editor
 */

import { Loader2, StickyNote } from 'lucide-react';

import { PageLayout } from '@ui';

import { NoteEditor } from '../NoteEditor';
import { NotesList } from '../NotesList';

import { useNotesPage } from './useNotesPage';

// ── Component ────────────────────────────────────────────────

export function NotesPage() {
  const { isLoading, selectedNote } = useNotesPage();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — notes list */}
        <div className="border-border w-72 shrink-0 border-r">
          <NotesList />
        </div>

        {/* Right panel — editor or empty state */}
        <div className="flex-1">
          {selectedNote ? (
            <NoteEditor note={selectedNote} />
          ) : (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3">
              <StickyNote className="h-12 w-12 opacity-30" />
              <p className="text-sm">Select a note or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
