/**
 * Test Suite Baseline Store — Drizzle CRUD for test_suite_baselines table
 */

import fs from 'node:fs';
import path from 'node:path';

import { eq, and } from 'drizzle-orm';
import { generateId } from '@shared/lib/id';

import { testSuiteBaselines } from './schema';

import type { AdcDatabase } from '../../db';

export interface BaselineRecord {
  id: string;
  scriptId: string;
  stepIndex: number;
  stepLabel: string;
  filePath: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

export interface BaselineService {
  get: (scriptId: string, stepIndex: number) => BaselineRecord | null;
  listByScript: (scriptId: string) => BaselineRecord[];
  setBaseline: (params: {
    scriptId: string;
    stepIndex: number;
    stepLabel: string;
    sourceFilePath: string;
    baselineDir: string;
    width: number;
    height: number;
  }) => BaselineRecord;
  deleteByScript: (scriptId: string) => void;
}

export function createBaselineService(db: AdcDatabase): BaselineService {
  const store: BaselineService = {
    get(scriptId, stepIndex) {
      const rows = db
        .select()
        .from(testSuiteBaselines)
        .where(
          and(
            eq(testSuiteBaselines.scriptId, scriptId),
            eq(testSuiteBaselines.stepIndex, stepIndex),
          ),
        )
        .all();
      const row = rows.at(0);
      return row ? (row as BaselineRecord) : null;
    },

    listByScript(scriptId) {
      return db
        .select()
        .from(testSuiteBaselines)
        .where(eq(testSuiteBaselines.scriptId, scriptId))
        .all() as BaselineRecord[];
    },

    setBaseline(params) {
      const now = new Date().toISOString();
      const id = generateId();
      const destFileName = `baseline-${params.scriptId}-${params.stepIndex}.png`;
      const destPath = path.join(params.baselineDir, destFileName);

      if (!fs.existsSync(params.baselineDir)) {
        fs.mkdirSync(params.baselineDir, { recursive: true });
      }

      fs.copyFileSync(params.sourceFilePath, destPath);

      const existing = store.get(params.scriptId, params.stepIndex);

      if (existing) {
        db.update(testSuiteBaselines)
          .set({
            filePath: destPath,
            stepLabel: params.stepLabel,
            width: params.width,
            height: params.height,
            updatedAt: now,
          })
          .where(eq(testSuiteBaselines.id, existing.id))
          .run();

        return { ...existing, filePath: destPath, updatedAt: now };
      }

      const record: BaselineRecord = {
        id,
        scriptId: params.scriptId,
        stepIndex: params.stepIndex,
        stepLabel: params.stepLabel,
        filePath: destPath,
        width: params.width,
        height: params.height,
        createdAt: now,
        updatedAt: now,
      };

      db.insert(testSuiteBaselines).values(record).run();
      return record;
    },

    deleteByScript(scriptId) {
      const baselines = store.listByScript(scriptId);
      for (const b of baselines) {
        if (fs.existsSync(b.filePath)) fs.unlinkSync(b.filePath);
      }
      db.delete(testSuiteBaselines)
        .where(eq(testSuiteBaselines.scriptId, scriptId))
        .run();
    },
  };

  return store;
}
