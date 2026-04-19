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
  index: (params: { runId: string; scriptId: string; screenshotDir: string; projectPath?: string }) => ScreenshotRecord[];
  list: (runId: string) => ScreenshotRecord[];
  listByScript: (scriptId: string) => ScreenshotRecord[];
  get: (id: string) => ScreenshotRecord | null;
}

// ─── Helpers ────────────────────────────────────────────────

/** Read width × height from a PNG file's IHDR chunk (bytes 16-23). */
function readPngDimensions(filePath: string): { width: number; height: number } {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } catch {
    return { width: 0, height: 0 };
  }
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
      console.warn('[screenshot-service] index() called:', {
        runId: params.runId,
        scriptId: params.scriptId,
        screenshotDir: params.screenshotDir,
        exists: fs.existsSync(params.screenshotDir),
        projectPath: params.projectPath,
      });

      const records: ScreenshotRecord[] = [];

      // 1. Scan our custom SCREENSHOT_DIR for files like "01-navigate.png"
      if (fs.existsSync(params.screenshotDir)) {
        const allFiles = fs.readdirSync(params.screenshotDir);
        const files = allFiles.filter((f) => f.endsWith('.png')).sort();
        console.warn('[screenshot-service] custom dir files:', { total: allFiles.length, pngs: files.length, files });

        for (const file of files) {
          const match = /^(\d+)-(\w+)\.png$/.exec(file);
          const stepIndex = match ? parseInt(match[1], 10) : 0;
          const triggerRaw = match ? match[2] : 'manual';
          const trigger = mapTrigger(triggerRaw);
          const fullPath = path.join(params.screenshotDir, file);
          const { width, height } = readPngDimensions(fullPath);

          records.push({
            id: generateId(),
            runId: params.runId,
            scriptId: params.scriptId,
            stepIndex,
            stepLabel: `${trigger} step ${stepIndex}`,
            trigger,
            filePath: fullPath,
            width,
            height,
            capturedAt: new Date().toISOString(),
          });
        }
      } else {
        console.warn('[screenshot-service] screenshotDir does not exist:', params.screenshotDir);
      }

      // 2. Fallback: scan Playwright's test-results/ for built-in screenshots
      if (records.length === 0 && params.projectPath) {
        const testResultsDir = path.join(params.projectPath, 'test-results');
        console.warn('[screenshot-service] fallback: scanning test-results/', { exists: fs.existsSync(testResultsDir) });
        if (fs.existsSync(testResultsDir)) {
          const pngs = findPngsRecursive(testResultsDir);
          console.warn('[screenshot-service] found in test-results:', pngs.length);
          let idx = 0;
          for (const fullPath of pngs) {
            const { width, height } = readPngDimensions(fullPath);
            const baseName = path.basename(fullPath, '.png');
            records.push({
              id: generateId(),
              runId: params.runId,
              scriptId: params.scriptId,
              stepIndex: idx++,
              stepLabel: baseName,
              trigger: 'manual',
              filePath: fullPath,
              width,
              height,
              capturedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Batch insert into SQLite
      for (const record of records) {
        db.insert(testSuiteScreenshots).values(record).run();
      }

      console.warn('[screenshot-service] indexed total:', records.length);
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

// ─── Recursive PNG finder ──────────────────────────────────

/** Recursively find all .png files in a directory (for Playwright test-results). */
function findPngsRecursive(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findPngsRecursive(fullPath));
      } else if (entry.name.endsWith('.png')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory access error — skip
  }
  return results;
}

// ─── Trigger mapping ────────────────────────────────────────

function mapTrigger(raw: string): ScreenshotRecord['trigger'] {
  if (raw === 'navigate') return 'nav';
  if (raw === 'click') return 'click';
  if (raw === 'fill') return 'fill';
  if (raw === 'assert') return 'assert';
  return 'manual';
}
