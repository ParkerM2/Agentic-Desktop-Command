/**
 * QA Recorder Script Store — Drizzle CRUD for qa_scripts table
 */

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { qaScripts } from '../../../db/schema';

import type { AdcDatabase } from '../../../db';

export interface QaScript {
  id: string;
  name: string;
  description?: string;
  steps: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface ScriptStore {
  list: () => QaScript[];
  get: (id: string) => QaScript | null;
  save: (data: {
    id?: string;
    name: string;
    description?: string;
    steps: unknown[];
  }) => QaScript;
  delete: (id: string) => { success: boolean };
}

function toQaScript(row: typeof qaScripts.$inferSelect): QaScript {
  return {
    id: row.id,
    name: row.name,
    description: undefined,
    steps: row.steps,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createScriptStore(db: AdcDatabase): ScriptStore {
  return {
    list() {
      return db.select().from(qaScripts).all().map(toQaScript);
    },

    get(id) {
      const rows = db.select().from(qaScripts).where(eq(qaScripts.id, id)).all();
      const row = rows.at(0);
      return row ? toQaScript(row) : null;
    },

    save(data) {
      const now = new Date().toISOString();
      const existing = data.id
        ? db.select().from(qaScripts).where(eq(qaScripts.id, data.id)).all().at(0)
        : undefined;

      if (existing) {
        const updated = {
          ...existing,
          name: data.name,
          steps: data.steps,
          updatedAt: now,
        };
        db.update(qaScripts).set(updated).where(eq(qaScripts.id, existing.id)).run();
        return toQaScript(updated);
      }

      const record = {
        id: data.id ?? randomUUID(),
        name: data.name,
        baseUrl: '',
        steps: data.steps,
        projectId: null,
        filePath: null,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(qaScripts).values(record).run();
      return toQaScript(record);
    },

    delete(id) {
      const result = db.delete(qaScripts).where(eq(qaScripts.id, id)).run();
      return { success: result.changes > 0 };
    },
  };
}
