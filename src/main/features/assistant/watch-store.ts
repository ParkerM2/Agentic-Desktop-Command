/**
 * Watch Store — SQLite-backed storage for assistant watches
 *
 * Watches are stored in the assistant_watches table.
 * One-shot watches (default) are marked triggered after firing.
 */

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import type { AssistantWatch } from '@shared/types';

import type { AdcDatabase } from '@main/db';

import { assistantWatches } from './schema';

export interface WatchStore {
  add: (watch: Omit<AssistantWatch, 'id' | 'createdAt' | 'triggered'>) => AssistantWatch;
  remove: (id: string) => void;
  getActive: () => AssistantWatch[];
  getAll: () => AssistantWatch[];
  markTriggered: (id: string) => void;
  clear: () => void;
}

function rowToWatch(row: typeof assistantWatches.$inferSelect): AssistantWatch {
  return {
    id: row.id,
    type: row.type as AssistantWatch['type'],
    targetId: row.targetId,
    condition: row.condition as AssistantWatch['condition'],
    action: row.action as AssistantWatch['action'],
    followUp: row.followUp ?? undefined,
    createdAt: row.createdAt,
    triggered: row.triggered,
    expiresAt: row.expiresAt ?? undefined,
  };
}

export function createWatchStore(deps: { db: AdcDatabase }): WatchStore {
  const { db } = deps;

  return {
    add(partial) {
      const id = randomUUID();
      const now = new Date().toISOString();

      db.insert(assistantWatches)
        .values({
          id,
          type: partial.type,
          targetId: partial.targetId,
          condition: partial.condition,
          action: partial.action,
          followUp: partial.followUp ?? null,
          createdAt: now,
          triggered: false,
          expiresAt: partial.expiresAt ?? null,
        })
        .run();

      return {
        ...partial,
        id,
        createdAt: now,
        triggered: false,
      };
    },

    remove(id) {
      db.delete(assistantWatches).where(eq(assistantWatches.id, id)).run();
    },

    getActive() {
      return db
        .select()
        .from(assistantWatches)
        .where(eq(assistantWatches.triggered, false))
        .all()
        .map(rowToWatch);
    },

    getAll() {
      return db.select().from(assistantWatches).all().map(rowToWatch);
    },

    markTriggered(id) {
      db.update(assistantWatches)
        .set({ triggered: true })
        .where(eq(assistantWatches.id, id))
        .run();
    },

    clear() {
      db.delete(assistantWatches).run();
    },
  };
}
