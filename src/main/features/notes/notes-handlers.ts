/**
 * Notes IPC handlers
 */

import { NOTES } from '@shared/ipc/misc/notes.channels';

import type { NotesService } from "./notes-service";
import type { IpcRouter } from '../../ipc/router';

export function registerNotesHandlers(router: IpcRouter, service: NotesService): void {
  router.handle(NOTES.LIST.ALL, (filters) => Promise.resolve(service.listNotes(filters)));

  router.handle(NOTES.CREATE.NOTE, (data) => Promise.resolve(service.createNote(data)));

  router.handle(NOTES.UPDATE.NOTE, ({ id, ...updates }) =>
    Promise.resolve(service.updateNote(id, updates)),
  );

  router.handle(NOTES.DELETE.NOTE, ({ id }) => Promise.resolve(service.deleteNote(id)));

  router.handle(NOTES.SEARCH.NOTES, ({ query }) => Promise.resolve(service.searchNotes(query)));
}
