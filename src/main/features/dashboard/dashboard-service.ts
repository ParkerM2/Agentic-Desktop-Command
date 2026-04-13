/**
 * Dashboard Service — SQLite-backed quick captures
 *
 * Captures are stored in the `captures` SQLite table.
 * One-time migration from captures.json on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { desc, eq } from 'drizzle-orm';

import { DASHBOARD_EVENTS } from '@shared/ipc/dashboard/channels';
import { generateId } from '@shared/lib/id';

import { captures } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('dashboard-service');

export interface Capture {
  id: string;
  text: string;
  createdAt: string;
}

export interface DashboardService {
  listCaptures: () => Capture[];
  createCapture: (text: string, id?: string) => Capture;
  updateCapture: (id: string, text: string) => Capture;
  deleteCapture: (id: string) => { success: boolean };
}

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(captures).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'captures.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { captures?: Capture[] };
    const items = Array.isArray(parsed.captures) ? parsed.captures : [];

    for (const item of items) {
      db.insert(captures).values({
        id: item.id,
        text: item.text,
        createdAt: item.createdAt,
      }).run();
    }
    logger.info(`Migrated ${String(items.length)} captures from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate captures from JSON:', err);
  }
}

export function createDashboardService(deps: {
  db: AdcDatabase;
  router: IpcRouter;
  dataDir: string;
}): DashboardService {
  const { db, router, dataDir } = deps;

  migrateFromJson(db, dataDir);

  return {
    listCaptures() {
      return db.select().from(captures)
        .orderBy(desc(captures.createdAt))
        .all();
    },

    createCapture(text, id?) {
      const capture: Capture = {
        id: id ?? generateId(),
        text,
        createdAt: new Date().toISOString(),
      };
      db.insert(captures).values(capture).run();
      router.emit(DASHBOARD_EVENTS.CAPTURE.CHANGED, { captureId: capture.id });
      return capture;
    },

    updateCapture(id, text) {
      const result = db.update(captures).set({ text }).where(eq(captures.id, id)).run();
      if (result.changes === 0) {
        throw new Error(`Capture not found: ${id}`);
      }
      const updated = db.select().from(captures).where(eq(captures.id, id)).get();
      if (!updated) {
        throw new Error(`Capture not found after update: ${id}`);
      }
      router.emit(DASHBOARD_EVENTS.CAPTURE.CHANGED, { captureId: id });
      return updated;
    },

    deleteCapture(id) {
      const result = db.delete(captures).where(eq(captures.id, id)).run();
      if (result.changes === 0) {
        throw new Error(`Capture not found: ${id}`);
      }
      router.emit(DASHBOARD_EVENTS.CAPTURE.CHANGED, { captureId: id });
      return { success: true };
    },
  };
}
