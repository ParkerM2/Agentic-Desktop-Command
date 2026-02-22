/**
 * Milestones Service — Disk-persisted roadmap milestones
 *
 * Milestones are stored as JSON in the app's user data directory.
 * All methods are synchronous; IPC handlers wrap with Promise.resolve().
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Milestone, MilestoneStatus } from '@shared/types';

import type { ReinitializableService } from '@main/services/data-management';

import type { IpcRouter } from '../../ipc/router';

export interface MilestonesService extends ReinitializableService {
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

interface MilestonesFile {
  milestones: Milestone[];
}

function loadFile(filePath: string): MilestonesFile {
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<MilestonesFile>;
      return {
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      };
    } catch {
      return { milestones: [] };
    }
  }
  return { milestones: [] };
}

function saveFile(filePath: string, data: MilestonesFile): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function findMilestone(store: MilestonesFile, id: string): { milestone: Milestone; index: number } {
  const index = store.milestones.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`Milestone not found: ${id}`);
  }
  return { milestone: store.milestones[index], index };
}

export function createMilestonesService(deps: {
  dataDir: string;
  router: IpcRouter;
}): MilestonesService {
  // Mutable file path for user-scoping
  let currentFilePath = join(deps.dataDir, 'milestones.json');
  // In-memory cache
  let store = loadFile(currentFilePath);

  function persist(): void {
    saveFile(currentFilePath, store);
  }

  function emitChanged(milestoneId: string): void {
    deps.router.emit('event:milestone.changed', { milestoneId });
  }

  return {
    listMilestones(filters) {
      let result = [...store.milestones];

      if (filters.projectId) {
        result = result.filter((m) => m.projectId === filters.projectId);
      }

      result.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
      return result;
    },

    createMilestone(data) {
      const now = new Date().toISOString();
      const milestone: Milestone = {
        id: randomUUID(),
        title: data.title,
        description: data.description,
        targetDate: data.targetDate,
        status: 'planned',
        tasks: [],
        projectId: data.projectId,
        createdAt: now,
        updatedAt: now,
      };
      store.milestones.push(milestone);
      persist();
      emitChanged(milestone.id);
      return milestone;
    },

    updateMilestone(id, updates) {
      const { milestone, index } = findMilestone(store, id);
      const updated: Milestone = {
        ...milestone,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      store.milestones[index] = updated;
      persist();
      emitChanged(updated.id);
      return updated;
    },

    deleteMilestone(id) {
      const { index } = findMilestone(store, id);
      store.milestones.splice(index, 1);
      persist();
      emitChanged(id);
      return { success: true };
    },

    addTask(milestoneId, title) {
      const { milestone, index } = findMilestone(store, milestoneId);
      const task = { id: randomUUID(), title, completed: false };
      const updated: Milestone = {
        ...milestone,
        tasks: [...milestone.tasks, task],
        updatedAt: new Date().toISOString(),
      };
      store.milestones[index] = updated;
      persist();
      emitChanged(milestoneId);
      return updated;
    },

    toggleTask(milestoneId, taskId) {
      const { milestone, index } = findMilestone(store, milestoneId);
      const tasks = milestone.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t,
      );
      const updated: Milestone = {
        ...milestone,
        tasks,
        updatedAt: new Date().toISOString(),
      };
      store.milestones[index] = updated;
      persist();
      emitChanged(milestoneId);
      return updated;
    },

    reinitialize(dataDir: string) {
      currentFilePath = join(dataDir, 'milestones.json');
      // Reload data from new path
      store = loadFile(currentFilePath);
    },

    clearState() {
      store = { milestones: [] };
    },
  };
}
