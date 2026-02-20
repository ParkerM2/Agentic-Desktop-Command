/**
 * Plan Tracker Service
 *
 * Reads and writes docs/tracker.json for plan lifecycle tracking.
 * Synchronous local file service — returns values directly (not Promises).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { TrackerFile, TrackerPlan } from '@shared/types/tracker';

export interface TrackerService {
  list: () => TrackerFile;
  get: (key: string) => TrackerPlan | null;
  update: (
    key: string,
    patch: Partial<Pick<TrackerPlan, 'branch' | 'pr' | 'status' | 'tags'>>,
  ) => TrackerPlan;
}

export function createTrackerService(projectRoot: string): TrackerService {
  const trackerPath = join(projectRoot, 'docs', 'tracker.json');

  function readTracker(): TrackerFile {
    if (!existsSync(trackerPath)) {
      return { version: 2, lastUpdated: new Date().toISOString().slice(0, 10), plans: {} };
    }
    const raw = readFileSync(trackerPath, 'utf-8');
    return JSON.parse(raw) as TrackerFile;
  }

  function writeTracker(tracker: TrackerFile): void {
    tracker.lastUpdated = new Date().toISOString().slice(0, 10);
    writeFileSync(trackerPath, `${JSON.stringify(tracker, null, 2)}\n`, 'utf-8');
  }

  return {
    list(): TrackerFile {
      return readTracker();
    },

    get(key: string): TrackerPlan | null {
      const tracker = readTracker();
      return tracker.plans[key] ?? null;
    },

    update(
      key: string,
      patch: Partial<Pick<TrackerPlan, 'branch' | 'pr' | 'status' | 'tags'>>,
    ): TrackerPlan {
      const tracker = readTracker();
      const existing = tracker.plans[key] as TrackerPlan | undefined;
      if (existing === undefined) {
        throw new Error(`Tracker entry "${key}" not found`);
      }

      if (patch.status !== undefined) {
        existing.status = patch.status;
        existing.statusChangedAt = new Date().toISOString().slice(0, 10);
      }
      if (patch.branch !== undefined) {
        existing.branch = patch.branch;
      }
      if (patch.pr !== undefined) {
        existing.pr = patch.pr;
      }
      if (patch.tags !== undefined) {
        existing.tags = patch.tags;
      }

      writeTracker(tracker);
      return existing;
    },
  };
}
