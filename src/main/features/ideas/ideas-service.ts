/**
 * Ideas Service — SQLite-backed idea board
 *
 * Ideas are stored in the `ideas` SQLite table.
 * One-time migration from ideas.json on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { and, desc, eq } from 'drizzle-orm';

import { IDEAS_EVENTS } from '@shared/ipc/misc/ideas.channels';
import { generateId } from '@shared/lib/id';
import type { Idea, IdeaCategory, IdeaStatus } from '@shared/types';

import { ideas } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('ideas-service');

export interface IdeasService {
  listIdeas: (filters: {
    projectId?: string;
    status?: IdeaStatus;
    category?: IdeaCategory;
  }) => Idea[];
  createIdea: (data: {
    id?: string;
    title: string;
    description: string;
    category: IdeaCategory;
    tags?: string[];
    projectId?: string;
  }) => Idea;
  updateIdea: (
    id: string,
    updates: {
      title?: string;
      description?: string;
      status?: IdeaStatus;
      category?: IdeaCategory;
      tags?: string[];
    },
  ) => Idea;
  deleteIdea: (id: string) => { success: boolean };
  voteIdea: (id: string, delta: number) => Idea;
}

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(ideas).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'ideas.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { ideas?: Idea[] };
    const items = Array.isArray(parsed.ideas) ? parsed.ideas : [];

    for (const item of items) {
      db.insert(ideas).values({
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status,
        category: item.category,
        tags: item.tags,
        projectId: item.projectId,
        votes: item.votes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }).run();
    }
    logger.info(`Migrated ${String(items.length)} ideas from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate ideas from JSON:', err);
  }
}

/** Map a raw DB row to the Idea interface (coerce projectId null → undefined). */
function toIdea(row: typeof ideas.$inferSelect): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as IdeaStatus,
    category: row.category as IdeaCategory,
    tags: row.tags,
    projectId: row.projectId ?? undefined,
    votes: row.votes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createIdeasService(deps: {
  db: AdcDatabase;
  router: IpcRouter;
  dataDir: string;
}): IdeasService {
  const { db, router, dataDir } = deps;

  migrateFromJson(db, dataDir);

  function emitChanged(ideaId: string): void {
    router.emit(IDEAS_EVENTS.IDEA.CHANGED, { ideaId });
  }

  return {
    listIdeas(filters) {
      const conditions = [];

      if (filters.projectId) {
        conditions.push(eq(ideas.projectId, filters.projectId));
      }
      if (filters.status) {
        conditions.push(eq(ideas.status, filters.status));
      }
      if (filters.category) {
        conditions.push(eq(ideas.category, filters.category));
      }

      const query = db.select().from(ideas);
      const rows = conditions.length > 0
        ? query.where(and(...conditions)).orderBy(desc(ideas.votes), desc(ideas.createdAt)).all()
        : query.orderBy(desc(ideas.votes), desc(ideas.createdAt)).all();

      return rows.map(toIdea);
    },

    createIdea(data) {
      const now = new Date().toISOString();
      const idea: Idea = {
        id: data.id ?? generateId(),
        title: data.title,
        description: data.description,
        status: 'new',
        category: data.category,
        tags: data.tags ?? [],
        projectId: data.projectId,
        votes: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(ideas).values({
        ...idea,
        projectId: idea.projectId ?? null,
      }).run();
      emitChanged(idea.id);
      return idea;
    },

    updateIdea(id, updates) {
      const rows = db.select().from(ideas).where(eq(ideas.id, id)).all();
      if (rows.length === 0) {
        throw new Error(`Idea not found: ${id}`);
      }
      const existing = toIdea(rows[0]);
      const now = new Date().toISOString();

      const updated: Idea = {
        ...existing,
        ...updates,
        updatedAt: now,
      };

      db.update(ideas).set({
        title: updated.title,
        description: updated.description,
        status: updated.status,
        category: updated.category,
        tags: updated.tags,
        updatedAt: now,
      }).where(eq(ideas.id, id)).run();

      emitChanged(id);
      return updated;
    },

    deleteIdea(id) {
      const result = db.delete(ideas).where(eq(ideas.id, id)).run();
      if (result.changes === 0) {
        throw new Error(`Idea not found: ${id}`);
      }
      emitChanged(id);
      return { success: true };
    },

    voteIdea(id, delta) {
      const rows = db.select().from(ideas).where(eq(ideas.id, id)).all();
      if (rows.length === 0) {
        throw new Error(`Idea not found: ${id}`);
      }
      const existing = toIdea(rows[0]);
      const newVotes = Math.max(0, existing.votes + delta);
      const now = new Date().toISOString();

      db.update(ideas).set({
        votes: newVotes,
        updatedAt: now,
      }).where(eq(ideas.id, id)).run();

      const updated: Idea = {
        ...existing,
        votes: newVotes,
        updatedAt: now,
      };
      emitChanged(id);
      return updated;
    },
  };
}
