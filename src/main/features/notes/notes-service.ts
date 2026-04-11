/**
 * Notes Service — SQLite-backed notes
 *
 * Notes are stored in the `notes` SQLite table.
 * One-time migration from notes.json on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { desc, eq, like, or } from 'drizzle-orm';

import { NOTES_EVENTS } from '@shared/ipc/misc/notes.channels';
import { generateId } from '@shared/lib/id';
import type { Note } from '@shared/types';

import { notes } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('notes-service');

export interface NotesService {
  listNotes: (filters: { projectId?: string; tag?: string }) => Note[];
  createNote: (data: {
    id?: string;
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

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(notes).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'notes.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { notes?: Note[] };
    const items = Array.isArray(parsed.notes) ? parsed.notes : [];

    for (const item of items) {
      db.insert(notes).values({
        id: item.id,
        title: item.title,
        content: item.content,
        tags: item.tags,
        projectId: item.projectId,
        taskId: item.taskId,
        pinned: item.pinned,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }).run();
    }
    logger.info(`Migrated ${String(items.length)} notes from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate notes from JSON:', err);
  }
}

function toNote(row: typeof notes.$inferSelect): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags,
    projectId: row.projectId ?? undefined,
    taskId: row.taskId ?? undefined,
    pinned: row.pinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createNotesService(deps: {
  db: AdcDatabase;
  router: IpcRouter;
  dataDir: string;
}): NotesService {
  const { db, router, dataDir } = deps;

  migrateFromJson(db, dataDir);

  return {
    listNotes(filters) {
      let rows = db.select().from(notes)
        .orderBy(desc(notes.pinned), desc(notes.updatedAt))
        .all();

      if (filters.projectId) {
        rows = rows.filter((r) => r.projectId === filters.projectId);
      }
      if (filters.tag) {
        const {tag} = filters;
        rows = rows.filter((r) => r.tags.includes(tag));
      }

      return rows.map(toNote);
    },

    createNote(data) {
      const now = new Date().toISOString();
      const record = {
        id: data.id ?? generateId(),
        title: data.title,
        content: data.content,
        tags: data.tags ?? [],
        projectId: data.projectId ?? null,
        taskId: data.taskId ?? null,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(notes).values(record).run();
      router.emit(NOTES_EVENTS.NOTE.CHANGED, { noteId: record.id });
      return toNote(record);
    },

    updateNote(id, updates) {
      const rows = db.select().from(notes).where(eq(notes.id, id)).all();
      const existing = rows.at(0);
      if (existing === undefined) {
        throw new Error(`Note not found: ${id}`);
      }
      const updated = {
        ...existing,
        ...(updates.title === undefined ? {} : { title: updates.title }),
        ...(updates.content === undefined ? {} : { content: updates.content }),
        ...(updates.tags === undefined ? {} : { tags: updates.tags }),
        ...(updates.pinned === undefined ? {} : { pinned: updates.pinned }),
        updatedAt: new Date().toISOString(),
      };
      db.update(notes).set(updated).where(eq(notes.id, id)).run();
      router.emit(NOTES_EVENTS.NOTE.CHANGED, { noteId: id });
      return toNote(updated);
    },

    deleteNote(id) {
      const result = db.delete(notes).where(eq(notes.id, id)).run();
      if (result.changes === 0) {
        throw new Error(`Note not found: ${id}`);
      }
      router.emit(NOTES_EVENTS.NOTE.CHANGED, { noteId: id });
      return { success: true };
    },

    searchNotes(query) {
      const pattern = `%${query}%`;
      const rows = db.select().from(notes)
        .where(or(
          like(notes.title, pattern),
          like(notes.content, pattern),
        ))
        .all();
      return rows.map(toNote);
    },
  };
}
