/**
 * Screenshot Capture — Drizzle-backed store + post-run indexer
 *
 * Scans the screenshot directory after a test run completes, parses
 * filenames into ScreenshotRecord metadata, and persists them in the
 * test_suite_screenshots SQLite table.
 */

import fs from 'node:fs';
import path from 'node:path';

import { eq } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';

import { testSuiteScreenshots } from '../../db/schema';

import type { AdcDatabase } from '../../db';

// ─── Types ──────────────────────────────────────────────────

export interface ScreenshotRecord {
  id: string;
  runId: string;
  scriptId: string;
  stepIndex: number;
  stepLabel: string;
  trigger: 'nav' | 'click' | 'fill' | 'assert' | 'manual';
  filePath: string;
  width: number;
  height: number;
  capturedAt: string;
}

// ─── Service interface ────────────────────────────────────────

export interface ScreenshotService {
  index: (params: { runId: string; scriptId: string; screenshotDir: string }) => ScreenshotRecord[];
  list: (runId: string) => ScreenshotRecord[];
  listByScript: (scriptId: string) => ScreenshotRecord[];
  get: (id: string) => ScreenshotRecord | null;
}

// ─── Factory ────────────────────────────────────────────────

export function createScreenshotService(db: AdcDatabase): ScreenshotService {
  function toRecord(row: typeof testSuiteScreenshots.$inferSelect): ScreenshotRecord {
    return {
      id: row.id,
      runId: row.runId,
      scriptId: row.scriptId,
      stepIndex: row.stepIndex,
      stepLabel: row.stepLabel,
      trigger: row.trigger as ScreenshotRecord['trigger'],
      filePath: row.filePath,
      width: row.width,
      height: row.height,
      capturedAt: row.capturedAt,
    };
  }

  return {
    /**
     * Scan a screenshot directory after a run completes, parse filenames
     * into records, and persist them to the database.
     */
    index(params) {
      if (!fs.existsSync(params.screenshotDir)) return [];

      const files = fs
        .readdirSync(params.screenshotDir)
        .filter((f) => f.endsWith('.png'))
        .sort();

      const records: ScreenshotRecord[] = files.map((file) => {
        // Parse filename: "01-navigate.png" -> stepIndex=1, trigger=navigate
        const match = /^(\d+)-(\w+)\.png$/.exec(file);
        const stepIndex = match ? parseInt(match[1], 10) : 0;
        const triggerRaw = match ? match[2] : 'manual';
        const trigger = mapTrigger(triggerRaw);

        return {
          id: generateId(),
          runId: params.runId,
          scriptId: params.scriptId,
          stepIndex,
          stepLabel: `${trigger} step ${stepIndex}`,
          trigger,
          filePath: path.join(params.screenshotDir, file),
          width: 0,
          height: 0,
          capturedAt: new Date().toISOString(),
        };
      });

      // Batch insert into SQLite
      for (const record of records) {
        db.insert(testSuiteScreenshots).values(record).run();
      }

      return records;
    },

    /**
     * Retrieve indexed screenshots for a given run.
     */
    list(runId) {
      return db
        .select()
        .from(testSuiteScreenshots)
        .where(eq(testSuiteScreenshots.runId, runId))
        .all()
        .map(toRecord);
    },

    /**
     * Retrieve indexed screenshots for a given script.
     */
    listByScript(scriptId) {
      return db
        .select()
        .from(testSuiteScreenshots)
        .where(eq(testSuiteScreenshots.scriptId, scriptId))
        .all()
        .map(toRecord);
    },

    /**
     * Retrieve a single screenshot by its id.
     */
    get(id) {
      const row = db
        .select()
        .from(testSuiteScreenshots)
        .where(eq(testSuiteScreenshots.id, id))
        .all()
        .at(0);
      return row ? toRecord(row) : null;
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────

function mapTrigger(raw: string): ScreenshotRecord['trigger'] {
  if (raw === 'navigate') return 'nav';
  if (raw === 'click') return 'click';
  if (raw === 'fill') return 'fill';
  if (raw === 'assert') return 'assert';
  return 'manual';
}
