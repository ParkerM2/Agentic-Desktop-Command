import { hostname } from 'node:os';

import { eq } from 'drizzle-orm';

import { generateId } from '@shared/lib/id';

import { workspaces } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import type { AdcDatabase } from '../../db';

const logger = createScopedLogger('workspaces-service');

export interface WorkspaceRow {
  id: string;
  name: string;
  description: string | null;
  hostDeviceId: string | null;
  settings: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  description?: string;
  hostDeviceId?: string;
  settings: { autoStart: boolean; maxConcurrent: number; defaultBranch: string };
  createdAt: string;
  updatedAt: string;
}

function rowToRecord(row: WorkspaceRow): WorkspaceRecord {
  const settings = JSON.parse(row.settings) as WorkspaceRecord['settings'];
  return {
    id: row.id,
    name: row.name,
    ...(row.description !== null && { description: row.description }),
    ...(row.hostDeviceId !== null && { hostDeviceId: row.hostDeviceId }),
    settings,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface WorkspacesService {
  init: () => void;
  list: () => WorkspaceRecord[];
  create: (input: { name: string; description?: string }) => WorkspaceRecord;
  update: (id: string, input: {
    name?: string;
    description?: string;
    hostDeviceId?: string;
    settings?: Partial<WorkspaceRecord['settings']>;
  }) => WorkspaceRecord;
  delete: (id: string) => { success: boolean };
}

export function createWorkspacesService({ db }: { db: AdcDatabase }): WorkspacesService {
  function init(): void {
    const existing = db.select().from(workspaces).limit(1).all();
    if (existing.length > 0) return;

    const now = new Date().toISOString();
    const id = generateId();
    const name = hostname();
    db.insert(workspaces).values({
      id,
      name,
      description: null,
      hostDeviceId: null,
      settings: JSON.stringify({ autoStart: false, maxConcurrent: 3, defaultBranch: 'main' }),
      createdAt: now,
      updatedAt: now,
    }).run();
    logger.info(`[Workspaces] Auto-provisioned workspace "${name}" (${id})`);
  }

  function list(): WorkspaceRecord[] {
    return db.select().from(workspaces).all().map(rowToRecord);
  }

  function create(input: { name: string; description?: string }): WorkspaceRecord {
    const now = new Date().toISOString();
    const id = generateId();
    db.insert(workspaces).values({
      id,
      name: input.name,
      description: input.description ?? null,
      hostDeviceId: null,
      settings: JSON.stringify({ autoStart: false, maxConcurrent: 3, defaultBranch: 'main' }),
      createdAt: now,
      updatedAt: now,
    }).run();
    const row = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!row) throw new Error(`Workspace ${id} not found after insert`);
    return rowToRecord(row);
  }

  function update(id: string, input: {
    name?: string;
    description?: string;
    hostDeviceId?: string;
    settings?: Partial<WorkspaceRecord['settings']>;
  }): WorkspaceRecord {
    const existing = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!existing) throw new Error(`Workspace ${id} not found`);

    const now = new Date().toISOString();
    const existingSettings = JSON.parse(existing.settings) as WorkspaceRecord['settings'];
    const mergedSettings = input.settings
      ? { ...existingSettings, ...input.settings }
      : existingSettings;

    db.update(workspaces).set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.hostDeviceId !== undefined && { hostDeviceId: input.hostDeviceId }),
      settings: JSON.stringify(mergedSettings),
      updatedAt: now,
    }).where(eq(workspaces.id, id)).run();

    const updated = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!updated) throw new Error(`Workspace ${id} not found after update`);
    return rowToRecord(updated);
  }

  function deleteWorkspace(id: string): { success: boolean } {
    db.delete(workspaces).where(eq(workspaces.id, id)).run();
    return { success: true };
  }

  return { init, list, create, update, delete: deleteWorkspace };
}
