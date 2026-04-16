/**
 * Test Suite Shared Steps Store — Drizzle CRUD for test_suite_shared_steps table
 *
 * Stores reusable step sequences grouped by domain. The `steps` column holds
 * a JSON-serialized TestSuiteStep[] array.
 */

import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import type { TestSuiteStep } from '@shared/types/test-suite';

import { testSuiteSharedSteps } from './schema-shared-steps';

import type { AdcDatabase } from '../../db';

export interface SharedStepGroup {
  id: string;
  projectId: string;
  name: string;
  domain: string;
  description: string | null;
  steps: TestSuiteStep[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SharedStepsStore {
  list: (projectId: string) => SharedStepGroup[];
  listByDomain: (projectId: string, domain: string) => SharedStepGroup[];
  get: (id: string) => SharedStepGroup | null;
  create: (params: {
    projectId: string;
    name: string;
    domain: string;
    description?: string;
    steps: TestSuiteStep[];
  }) => SharedStepGroup;
  update: (
    id: string,
    params: {
      name?: string;
      domain?: string;
      description?: string;
      steps?: TestSuiteStep[];
    },
  ) => SharedStepGroup | null;
  delete: (id: string) => void;
  incrementUsage: (id: string) => void;
  domains: (projectId: string) => string[];
}

function rowToGroup(row: typeof testSuiteSharedSteps.$inferSelect): SharedStepGroup {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    domain: row.domain,
    description: row.description,
    steps: JSON.parse(row.steps) as TestSuiteStep[],
    usageCount: row.usageCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createSharedStepsStore(db: AdcDatabase): SharedStepsStore {
  const store: SharedStepsStore = {
    list(projectId) {
      return db
        .select()
        .from(testSuiteSharedSteps)
        .where(eq(testSuiteSharedSteps.projectId, projectId))
        .all()
        .map(rowToGroup);
    },

    listByDomain(projectId, domain) {
      return db
        .select()
        .from(testSuiteSharedSteps)
        .where(
          and(
            eq(testSuiteSharedSteps.projectId, projectId),
            eq(testSuiteSharedSteps.domain, domain),
          ),
        )
        .all()
        .map(rowToGroup);
    },

    get(id) {
      const rows = db
        .select()
        .from(testSuiteSharedSteps)
        .where(eq(testSuiteSharedSteps.id, id))
        .all();
      const row = rows.at(0);
      return row ? rowToGroup(row) : null;
    },

    create(params) {
      const now = new Date().toISOString();
      const id = nanoid();

      const record = {
        id,
        projectId: params.projectId,
        name: params.name,
        domain: params.domain,
        description: params.description ?? null,
        steps: JSON.stringify(params.steps),
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      db.insert(testSuiteSharedSteps).values(record).run();

      return {
        id,
        projectId: params.projectId,
        name: params.name,
        domain: params.domain,
        description: record.description,
        steps: params.steps,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      };
    },

    update(id, params) {
      const existing = store.get(id);
      if (!existing) return null;

      const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (params.name !== undefined) updates.name = params.name;
      if (params.domain !== undefined) updates.domain = params.domain;
      if (params.description !== undefined) updates.description = params.description;
      if (params.steps !== undefined) updates.steps = JSON.stringify(params.steps);

      db.update(testSuiteSharedSteps)
        .set(updates)
        .where(eq(testSuiteSharedSteps.id, id))
        .run();

      return store.get(id);
    },

    delete(id) {
      db.delete(testSuiteSharedSteps).where(eq(testSuiteSharedSteps.id, id)).run();
    },

    incrementUsage(id) {
      db.update(testSuiteSharedSteps)
        .set({ usageCount: sql`${testSuiteSharedSteps.usageCount} + 1` })
        .where(eq(testSuiteSharedSteps.id, id))
        .run();
    },

    domains(projectId) {
      const rows = db
        .selectDistinct({ domain: testSuiteSharedSteps.domain })
        .from(testSuiteSharedSteps)
        .where(eq(testSuiteSharedSteps.projectId, projectId))
        .all();
      return rows.map((r) => r.domain);
    },
  };

  return store;
}
