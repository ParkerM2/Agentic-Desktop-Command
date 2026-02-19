/**
 * Hub Sync Service
 *
 * Bidirectional data synchronization between local JSON storage
 * and the hub backend. When the hub is available, mutations go
 * through the hub API. When unavailable, mutations are queued
 * locally and synced on reconnect.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import { hubLogger } from '@main/lib/logger';

import type { HubClient } from './hub-client';
import type { HubConnectionManager } from './hub-connection';

/** A queued mutation to sync when hub reconnects. */
interface PendingMutation {
  id: string;
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface HubSyncService {
  /** Queue a local mutation for syncing to hub. */
  queueMutation: (
    entity: string,
    action: PendingMutation['action'],
    data: Record<string, unknown>,
  ) => void;
  /** Sync all pending mutations to the hub. Returns number of synced items. */
  syncPending: () => Promise<number>;
  /** Get the count of pending (unsynced) mutations. */
  getPendingCount: () => number;
  /** Clear all pending mutations. */
  clearPending: () => void;
  /** Check if a sync should be attempted (hub available + pending items). */
  shouldSync: () => boolean;
}

const SYNC_QUEUE_FILENAME = 'hub-sync-queue.json';

function getQueuePath(): string {
  return join(app.getPath('userData'), SYNC_QUEUE_FILENAME);
}

function loadQueue(): PendingMutation[] {
  const queuePath = getQueuePath();
  if (!existsSync(queuePath)) {
    return [];
  }

  try {
    const raw = readFileSync(queuePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as PendingMutation[];
    }
    return [];
  } catch {
    hubLogger.error('[HubSync] Failed to load sync queue');
    return [];
  }
}

function saveQueue(queue: PendingMutation[]): void {
  const queuePath = getQueuePath();
  const dir = join(queuePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf-8');
}

function generateId(): string {
  return `${String(Date.now())}-${String(Math.random()).slice(2, 8)}`;
}

async function syncProjectMutation(
  client: HubClient,
  action: PendingMutation['action'],
  data: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'create': {
      const result = await client.createProject(data as { name: string; path: string });
      return result.success;
    }
    case 'update': {
      const result = await client.updateProject(data.id as string, data);
      return result.success;
    }
    case 'delete': {
      const result = await client.deleteProject(data.id as string);
      return result.success;
    }
  }
}

async function syncTaskMutation(
  client: HubClient,
  action: PendingMutation['action'],
  data: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'create': {
      const result = await client.createTask(
        data as {
          project_id: string;
          title: string;
          description?: string;
          status?: string;
          priority?: number;
        },
      );
      return result.success;
    }
    case 'update': {
      const result = await client.updateTask(data.id as string, data);
      return result.success;
    }
    case 'delete': {
      const result = await client.deleteTask(data.id as string);
      return result.success;
    }
  }
}

async function syncPlannerMutation(
  client: HubClient,
  action: PendingMutation['action'],
  data: Record<string, unknown>,
): Promise<boolean> {
  switch (action) {
    case 'create': {
      const result = await client.createPlannerEvent(
        data as {
          date: string;
          start_time: string;
          end_time: string;
          title: string;
          category?: string;
          task_id?: string;
        },
      );
      return result.success;
    }
    case 'update': {
      const result = await client.updatePlannerEvent(data.id as string, data);
      return result.success;
    }
    case 'delete': {
      const result = await client.deletePlannerEvent(data.id as string);
      return result.success;
    }
  }
}

async function syncMutation(client: HubClient, mutation: PendingMutation): Promise<boolean> {
  const { entity, action, data } = mutation;

  try {
    switch (entity) {
      case 'projects':
        return await syncProjectMutation(client, action, data);
      case 'tasks':
        return await syncTaskMutation(client, action, data);
      case 'captures': {
        if (action === 'create') {
          const result = await client.createCapture(data as { text: string; project_id?: string });
          return result.success;
        }
        const result = await client.deleteCapture(data.id as string);
        return result.success;
      }
      case 'planner_events':
        return await syncPlannerMutation(client, action, data);
      case 'settings': {
        const result = await client.updateSettings(data as Record<string, string>);
        return result.success;
      }
      default: {
        hubLogger.info(`[HubSync] Unknown entity: ${entity}`);
        return false;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync error';
    hubLogger.error(`[HubSync] Failed to sync ${entity}.${action}:`, message);
    return false;
  }
}

export function createHubSyncService(connectionManager: HubConnectionManager): HubSyncService {
  let queue: PendingMutation[] = loadQueue();

  return {
    queueMutation(entity, action, data) {
      const mutation: PendingMutation = {
        id: generateId(),
        entity,
        action,
        data,
        timestamp: new Date().toISOString(),
      };
      queue.push(mutation);
      saveQueue(queue);
      hubLogger.info(`[HubSync] Queued ${entity}.${action} (${String(queue.length)} pending)`);
    },

    async syncPending() {
      if (queue.length === 0) {
        return 0;
      }

      if (!connectionManager.isAvailable()) {
        hubLogger.info('[HubSync] Hub not available, skipping sync');
        return 0;
      }

      const client = connectionManager.getClient();
      let syncedCount = 0;
      const failedMutations: PendingMutation[] = [];

      for (const mutation of queue) {
        const success = await syncMutation(client, mutation);
        if (success) {
          syncedCount += 1;
        } else {
          failedMutations.push(mutation);
        }
      }

      queue = failedMutations;
      saveQueue(queue);

      hubLogger.info(
        `[HubSync] Synced ${String(syncedCount)} mutations, ${String(queue.length)} remaining`,
      );
      return syncedCount;
    },

    getPendingCount() {
      return queue.length;
    },

    clearPending() {
      queue = [];
      saveQueue(queue);
      hubLogger.info('[HubSync] Cleared sync queue');
    },

    shouldSync() {
      return queue.length > 0 && connectionManager.isAvailable();
    },
  };
}
