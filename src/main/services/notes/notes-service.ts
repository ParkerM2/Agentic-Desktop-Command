/**
 * Notes Service — Disk-persisted notes
 *
 * Notes are stored as JSON in the app's user data directory.
 * All methods are synchronous; IPC handlers wrap with Promise.resolve().
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Note } from '@shared/types';

import type { ReinitializableService } from '@main/services/data-management';

import type { IpcRouter } from '../../ipc/router';

export interface NotesService extends ReinitializableService {
  listNotes: (filters: { projectId?: string; tag?: string }) => Note[];
  createNote: (data: {
    title: string;
    content: string;
    tags?: string[];
    projectId?: string;
    taskId?: string;
  }) => Note;
  updateNote: (
    id: string,
    updates: { title?: string; content?: string; tags?: string[]; pinned?: boolean },
  ) => Note;
  deleteNote: (id: string) => { success: boolean };
  searchNotes: (query: string) => Note[];
}

interface NotesFile {
  notes: Note[];
}

function loadNotesFile(filePath: string): NotesFile {
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<NotesFile>;
      return {
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      };
    } catch {
      return { notes: [] };
    }
  }
  return { notes: [] };
}

function saveNotesFile(filePath: string, data: NotesFile): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function createNotesService(deps: { dataDir: string; router: IpcRouter }): NotesService {
  let currentFilePath = join(deps.dataDir, 'notes.json');
  let store = loadNotesFile(currentFilePath);

  function persist(): void {
    saveNotesFile(currentFilePath, store);
  }

  function emitChanged(noteId: string): void {
    deps.router.emit('event:note.changed', { noteId });
  }

  return {
    listNotes(filters) {
      let result = [...store.notes];

      if (filters.projectId) {
        result = result.filter((n) => n.projectId === filters.projectId);
      }

      if (filters.tag) {
        result = result.filter((n) => n.tags.includes(filters.tag ?? ''));
      }

      // Pinned first, then by updatedAt descending
      result.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });

      return result;
    },

    createNote(data) {
      const now = new Date().toISOString();
      const note: Note = {
        id: randomUUID(),
        title: data.title,
        content: data.content,
        tags: data.tags ?? [],
        projectId: data.projectId,
        taskId: data.taskId,
        createdAt: now,
        updatedAt: now,
        pinned: false,
      };
      store.notes.push(note);
      persist();
      emitChanged(note.id);
      return note;
    },

    updateNote(id, updates) {
      const index = store.notes.findIndex((n) => n.id === id);
      if (index === -1) {
        throw new Error(`Note not found: ${id}`);
      }
      const existing = store.notes[index];
      const updated: Note = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      store.notes[index] = updated;
      persist();
      emitChanged(updated.id);
      return updated;
    },

    deleteNote(id) {
      const index = store.notes.findIndex((n) => n.id === id);
      if (index === -1) {
        throw new Error(`Note not found: ${id}`);
      }
      store.notes.splice(index, 1);
      persist();
      emitChanged(id);
      return { success: true };
    },

    searchNotes(query) {
      const lower = query.toLowerCase();
      return store.notes.filter(
        (n) => n.title.toLowerCase().includes(lower) || n.content.toLowerCase().includes(lower),
      );
    },

    reinitialize(dataDir: string) {
      currentFilePath = join(dataDir, 'notes.json');
      store = loadNotesFile(currentFilePath);
    },

    clearState() {
      store = { notes: [] };
    },
  };
}
