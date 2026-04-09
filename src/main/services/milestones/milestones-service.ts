/**
 * Milestones Service — SQLite-backed roadmap milestones
 *
 * Milestones are stored in the `milestones` SQLite table.
 * One-time migration from milestones.json on first access.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { asc, eq } from 'drizzle-orm';

import { MILESTONES_EVENTS } from '@shared/ipc/misc/milestones.channels';
import type { Milestone, MilestoneStatus } from '@shared/types';

import { milestones } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('milestones-service');

export interface MilestonesService {
  listMilestones: (filters: { projectId?: string }) => Milestone[];
  createMilestone: (data: {
    title: string;
    description: string;
    targetDate: string;
    projectId?: string;
  }) => Milestone;
  updateMilestone: (
    id: string,
    updates: {
      title?: string;
      description?: string;
      targetDate?: string;
      status?: MilestoneStatus;
    },
  ) => Milestone;
  deleteMilestone: (id: string) => { success: boolean };
  addTask: (milestoneId: string, title: string) => Milestone;
  toggleTask: (milestoneId: string, taskId: string) => Milestone;
}

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const existing = db.select().from(milestones).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(dataDir, 'milestones.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { milestones?: Milestone[] };
    const items = Array.isArray(parsed.milestones) ? parsed.milestones : [];

    for (const item of items) {
      db.insert(milestones).values({
        id: item.id,
        title: item.title,
        description: item.description,
        targetDate: item.targetDate,
        status: item.status,
        tasks: item.tasks,
        projectId: item.projectId ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }).run();
    }
    logger.info(`Migrated ${String(items.length)} milestones from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate milestones from JSON:', err);
  }
}

function toMilestone(row: typeof milestones.$inferSelect): Milestone {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    targetDate: row.targetDate,
    status: row.status as MilestoneStatus,
    tasks: row.tasks,
    projectId: row.projectId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createMilestonesService(deps: {
  db: AdcDatabase;
  router: IpcRouter;
  dataDir: string;
}): MilestonesService {
  const { db, router, dataDir } = deps;

  migrateFromJson(db, dataDir);

  function emitChanged(milestoneId: string): void {
    router.emit(MILESTONES_EVENTS.MILESTONE.CHANGED, { milestoneId });
  }

  function findMilestone(id: string): typeof milestones.$inferSelect {
    const rows = db.select().from(milestones).where(eq(milestones.id, id)).all();
    const row = rows.at(0);
    if (row === undefined) {
      throw new Error(`Milestone not found: ${id}`);
    }
    return row;
  }

  return {
    listMilestones(filters) {
      let rows = db.select().from(milestones)
        .orderBy(asc(milestones.targetDate))
        .all();

      if (filters.projectId) {
        rows = rows.filter((r) => r.projectId === filters.projectId);
      }

      return rows.map(toMilestone);
    },

    createMilestone(data) {
      const now = new Date().toISOString();
      const record = {
        id: randomUUID(),
        title: data.title,
        description: data.description,
        targetDate: data.targetDate,
        status: 'planned' as const,
        tasks: [] as Array<{ id: string; title: string; completed: boolean }>,
        projectId: data.projectId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(milestones).values(record).run();
      emitChanged(record.id);
      return toMilestone(record);
    },

    updateMilestone(id, updates) {
      const existing = findMilestone(id);
      const updated = {
        ...existing,
        ...(updates.title === undefined ? {} : { title: updates.title }),
        ...(updates.description === undefined ? {} : { description: updates.description }),
        ...(updates.targetDate === undefined ? {} : { targetDate: updates.targetDate }),
        ...(updates.status === undefined ? {} : { status: updates.status }),
        updatedAt: new Date().toISOString(),
      };
      db.update(milestones).set(updated).where(eq(milestones.id, id)).run();
      emitChanged(id);
      return toMilestone(updated);
    },

    deleteMilestone(id) {
      const result = db.delete(milestones).where(eq(milestones.id, id)).run();
      if (result.changes === 0) {
        throw new Error(`Milestone not found: ${id}`);
      }
      emitChanged(id);
      return { success: true };
    },

    addTask(milestoneId, title) {
      const existing = findMilestone(milestoneId);
      const task = { id: randomUUID(), title, completed: false };
      const updatedTasks = [...existing.tasks, task];
      const now = new Date().toISOString();
      db.update(milestones)
        .set({ tasks: updatedTasks, updatedAt: now })
        .where(eq(milestones.id, milestoneId))
        .run();
      emitChanged(milestoneId);
      return toMilestone({ ...existing, tasks: updatedTasks, updatedAt: now });
    },

    toggleTask(milestoneId, taskId) {
      const existing = findMilestone(milestoneId);
      const updatedTasks = existing.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t,
      );
      const now = new Date().toISOString();
      db.update(milestones)
        .set({ tasks: updatedTasks, updatedAt: now })
        .where(eq(milestones.id, milestoneId))
        .run();
      emitChanged(milestoneId);
      return toMilestone({ ...existing, tasks: updatedTasks, updatedAt: now });
    },
  };
}
