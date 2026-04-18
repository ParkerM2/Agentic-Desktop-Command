/**
 * Test Suite Config Store
 *
 * SQLite-backed persistence for per-project test-suite configs.
 * Uses the `settings_kv` table with category='test-suite' and
 * composite key = `${projectId}:${configId}`.
 *
 * Follows the project's Drizzle convention (see hub-config-store.ts).
 */

import { and, eq, like } from 'drizzle-orm';

import type { TestSuiteConfig } from '@shared/ipc/test-suite/schemas';
import { generateId } from '@shared/lib/id';

import { settingsKv } from '../../db/schema';

import type { AdcDatabase } from '../../db';

const CATEGORY = 'test-suite';

function keyFor(projectId: string, configId: string): string {
  return `${projectId}:${configId}`;
}

export interface ConfigStore {
  list: (projectId: string) => TestSuiteConfig[];
  getActive: (projectId: string) => TestSuiteConfig | null;
  save: (projectId: string, config: TestSuiteConfig) => TestSuiteConfig;
  delete: (projectId: string, configId: string) => void;
  setActive: (projectId: string, configId: string) => void;
}

export function createConfigStore(db: AdcDatabase): ConfigStore {
  function list(projectId: string): TestSuiteConfig[] {
    const rows = db
      .select()
      .from(settingsKv)
      .where(and(eq(settingsKv.category, CATEGORY), like(settingsKv.key, `${projectId}:%`)))
      .all();

    return rows.map((row) => {
      const raw = row.settings as Record<string, unknown>;
      return {
        ...raw,
        browsers: raw.browsers ?? ['chromium'],
        workers: raw.workers ?? 1,
        retries: raw.retries ?? 1,
        storageStatePath: raw.storageStatePath ?? undefined,
        environments: raw.environments ?? [],
        activeEnvironment: raw.activeEnvironment ?? undefined,
      } as TestSuiteConfig;
    });
  }

  function getActive(projectId: string): TestSuiteConfig | null {
    return list(projectId).find((c) => c.isActive) ?? null;
  }

  function save(projectId: string, config: TestSuiteConfig): TestSuiteConfig {
    const key = keyFor(projectId, config.id);
    const now = new Date().toISOString();

    db.insert(settingsKv)
      .values({
        id: generateId(),
        key,
        category: CATEGORY,
        settings: config as unknown,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settingsKv.key,
        set: {
          settings: config as unknown,
          updatedAt: now,
        },
      })
      .run();

    return config;
  }

  function deleteConfig(projectId: string, configId: string): void {
    db.delete(settingsKv)
      .where(and(eq(settingsKv.category, CATEGORY), eq(settingsKv.key, keyFor(projectId, configId))))
      .run();
  }

  function setActive(projectId: string, configId: string): void {
    const all = list(projectId);
    for (const c of all) {
      save(projectId, { ...c, isActive: c.id === configId });
    }
  }

  return {
    list,
    getActive,
    save,
    delete: deleteConfig,
    setActive,
  };
}
