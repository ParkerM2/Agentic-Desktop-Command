/**
 * Notes feature — public API
 */

export { noteKeys } from './api/queryKeys';
export {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useSearchNotes,
} from './api/useNotes';
export { NoteEditor } from './components/NoteEditor';
export { NotesList } from './components/NotesList';
export { NotesPage } from './components/NotesPage';
export { QuickNote } from './components/QuickNote';
export { useNoteEvents } from './hooks/useNoteEvents';
export { useNotesUI } from './store';
