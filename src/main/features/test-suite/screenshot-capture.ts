/**
 * Screenshot Capture — In-memory store + post-run indexer
 *
 * Scans the screenshot directory after a test run completes, parses
 * filenames into ScreenshotRecord metadata, and stores them in a Map
 * keyed by runId. Screenshots are ephemeral per-run data — no DB table.
 */

import fs from 'node:fs';
import path from 'node:path';

import { nanoid } from 'nanoid';

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

// ─── In-memory store ────────────────────────────────────────

const store = new Map<string, ScreenshotRecord[]>();

// ─── Public API ─────────────────────────────────────────────

/**
 * Scan a screenshot directory after a run completes, parse filenames
 * into records, and store them in the in-memory map.
 */
export function indexScreenshots(params: {
  runId: string;
  scriptId: string;
  screenshotDir: string;
}): ScreenshotRecord[] {
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
      id: nanoid(),
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

  store.set(params.runId, records);
  return records;
}

/**
 * Retrieve indexed screenshots for a given run.
 */
export function getScreenshots(runId: string): ScreenshotRecord[] {
  return store.get(runId) ?? [];
}

/**
 * Retrieve a single screenshot by its id across all runs.
 */
export function getScreenshotById(id: string): ScreenshotRecord | null {
  for (const records of store.values()) {
    const found = records.find((r) => r.id === id);
    if (found) return found;
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────────

function mapTrigger(raw: string): ScreenshotRecord['trigger'] {
  if (raw === 'navigate') return 'nav';
  if (raw === 'click') return 'click';
  if (raw === 'fill') return 'fill';
  if (raw === 'assert') return 'assert';
  return 'manual';
}
