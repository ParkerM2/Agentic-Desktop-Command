/**
 * Test Suite Script Store — Drizzle CRUD for test_suite_scripts table
 */

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { testSuiteScripts } from '../../db/schema';

import type { AdcDatabase } from '../../db';

export interface QaScript {
  id: string;
  name: string;
  description: string | null;
  steps: unknown[];
  filePath: string;
  projectId: string;
  targetUrl: string;
  stepCount: number;
  lastStatus: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptStore {
  list: () => QaScript[];
  listByProject: (projectId: string) => QaScript[];
  get: (id: string) => QaScript | null;
  save: (data: {
    id?: string;
    name: string;
    description?: string;
    steps: unknown[];
    projectId: string;
    filePath: string;
    targetUrl: string;
  }) => QaScript;
  delete: (id: string) => { success: boolean };
}

function parseSteps(raw: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toQaScript(row: typeof testSuiteScripts.$inferSelect): QaScript {
  const steps = parseSteps(row.steps);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    steps,
    filePath: row.filePath,
    projectId: row.projectId,
    targetUrl: row.targetUrl,
    stepCount: row.stepCount,
    lastStatus: row.lastStatus ?? null,
    lastRunAt: row.lastRunAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createScriptStore(db: AdcDatabase): ScriptStore {
  return {
    list() {
      return db.select().from(testSuiteScripts).all().map(toQaScript);
    },

    listByProject(projectId) {
      return db.select().from(testSuiteScripts).where(eq(testSuiteScripts.projectId, projectId)).all().map(toQaScript);
    },

    get(id) {
      const rows = db.select().from(testSuiteScripts).where(eq(testSuiteScripts.id, id)).all();
      const row = rows.at(0);
      return row ? toQaScript(row) : null;
    },

    save(data) {
      const now = new Date().toISOString();
      const stepsJson = JSON.stringify(data.steps);
      const existing = data.id
        ? db.select().from(testSuiteScripts).where(eq(testSuiteScripts.id, data.id)).all().at(0)
        : undefined;

      if (existing) {
        const updated = {
          ...existing,
          name: data.name,
          description: data.description ?? existing.description,
          steps: stepsJson,
          filePath: data.filePath,
          targetUrl: data.targetUrl,
          stepCount: data.steps.length,
          updatedAt: now,
        };
        db.update(testSuiteScripts).set(updated).where(eq(testSuiteScripts.id, existing.id)).run();
        return toQaScript(updated);
      }

      const record = {
        id: data.id ?? nanoid(),
        name: data.name,
        description: data.description ?? null,
        baseUrl: data.targetUrl,
        steps: stepsJson,
        projectId: data.projectId,
        filePath: data.filePath,
        targetUrl: data.targetUrl,
        stepCount: data.steps.length,
        lastStatus: null,
        lastRunAt: null,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(testSuiteScripts).values(record).run();
      return toQaScript(record);
    },

    delete(id) {
      const result = db.delete(testSuiteScripts).where(eq(testSuiteScripts.id, id)).run();
      return { success: result.changes > 0 };
    },
  };
}
