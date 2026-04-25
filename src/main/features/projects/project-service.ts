/**
 * Project Service — local SQLite implementation
 *
 * Phase 5: Hub API proxy removed. Project list and sub-projects are
 * persisted in the device-local SQLite database. A small in-memory
 * cache is populated eagerly so dependent services can resolve
 * `getProjectPath()` synchronously.
 *
 * Future Phase 6 may add `projects` / `sub_projects` to SYNC_TABLES
 * for cross-device replication.
 */
/* eslint-disable @typescript-eslint/require-await -- public methods stay
   async to preserve the existing ProjectService contract; callers await
   them and Phase 6 may reintroduce real awaits for cross-device fan-out. */

import { existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import { dialog } from 'electron';

import { and, eq } from 'drizzle-orm';

import type { Project, SubProject } from '@shared/types';

import { projects as projectsTable, subProjects as subProjectsTable } from './schema';

import type { ProjectRow, SubProjectRow } from './schema';
import type { AdcDatabase } from '../../db';

// ─── Types ───────────────────────────────────────────────────

export interface ProjectAddInput {
  path: string;
  workspaceId?: string;
  name?: string;
  description?: string;
  repoStructure?: Project['repoStructure'];
  gitUrl?: string;
  defaultBranch?: string;
  subProjects?: Array<{
    name: string;
    relativePath: string;
    gitUrl?: string;
    defaultBranch?: string;
  }>;
}

export interface ProjectUpdateInput {
  projectId: string;
  name?: string;
  description?: string;
  gitUrl?: string;
  defaultBranch?: string;
  workspaceId?: string;
}

export interface ProjectService {
  listProjects: (workspaceId?: string) => Promise<Project[]>;
  addProject: (data: ProjectAddInput) => Promise<Project>;
  removeProject: (projectId: string) => Promise<{ success: boolean }>;
  updateProject: (data: ProjectUpdateInput) => Promise<Project>;
  selectDirectory: () => Promise<{ path: string | null }>;
  getSubProjects: (projectId: string) => Promise<SubProject[]>;
  createSubProject: (data: {
    projectId: string;
    name: string;
    relativePath: string;
    gitUrl?: string;
    defaultBranch?: string;
  }) => Promise<SubProject>;
  deleteSubProject: (
    projectId: string,
    subProjectId: string,
  ) => Promise<{ success: boolean }>;

  /** Initialize project-local directories (.adc/specs) */
  initializeProject: (projectId: string) => { success: boolean; error?: string };
  /** Resolve a project ID to its filesystem path (sync, for other services) */
  getProjectPath: (projectId: string) => string | undefined;
  /** Sync list for legacy callers — returns cached data */
  listProjectsSync: () => Project[];
}

export interface CreateProjectServiceDeps {
  db: AdcDatabase;
}

// ─── Helpers ─────────────────────────────────────────────────

function rowToProject(row: ProjectRow): Project {
  // Stamp both `path` (local Project shape) and `rootPath` (Hub flavor)
  // so callers and legacy serializations both keep working.
  const project = {
    id: row.id,
    workspaceId: row.workspaceId ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    path: row.rootPath,
    rootPath: row.rootPath,
    gitUrl: row.gitUrl ?? undefined,
    repoStructure: row.repoStructure as Project['repoStructure'],
    defaultBranch: row.defaultBranch,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  return project as Project;
}

function rowToSubProject(row: SubProjectRow): SubProject {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    relativePath: row.relativePath,
    gitUrl: row.gitUrl ?? undefined,
    defaultBranch: row.defaultBranch,
    createdAt: row.createdAt,
  };
}

// ─── Factory ─────────────────────────────────────────────────

export function createProjectService(deps: CreateProjectServiceDeps): ProjectService {
  const { db } = deps;

  // Local cache for sync access by dependent services
  const projectCache = new Map<string, Project>();

  /** Add or update a single project in the cache.
   *  Project rows store `rootPath` while local code expects `path` —
   *  normalize here so getProjectPath() always works. */
  function cacheProject(project: Project): void {
    const raw = project as unknown as Record<string, unknown>;
    const normalized: Project = {
      ...project,
      path: project.path || (raw.rootPath as string) || '',
    };
    projectCache.set(normalized.id, normalized);
  }

  function updateCache(items: Project[]): void {
    projectCache.clear();
    for (const p of items) cacheProject(p);
  }

  // Eagerly hydrate the cache so getProjectPath() works before the
  // first listProjects() call (services like worktreeService and
  // runners depend on it during bootstrap).
  try {
    const initial = db.select().from(projectsTable).all().map(rowToProject);
    updateCache(initial);
  } catch {
    // Table may not exist yet during early test setup; cache stays empty
    // and the next listProjects() will populate it.
  }

  return {
    initializeProject(projectId) {
      const projectPath = projectCache.get(projectId)?.path;
      if (!projectPath) {
        return { success: false, error: `Project ${projectId} not found` };
      }

      try {
        const adcDir = join(projectPath, '.adc');
        const specsDir = join(adcDir, 'specs');

        if (!existsSync(adcDir)) {
          mkdirSync(adcDir, { recursive: true });
        }
        if (!existsSync(specsDir)) {
          mkdirSync(specsDir, { recursive: true });
        }

        return { success: true };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    },

    getProjectPath(projectId) {
      return projectCache.get(projectId)?.path;
    },

    listProjectsSync() {
      return [...projectCache.values()];
    },

    async listProjects(workspaceId) {
      const rows = workspaceId
        ? db.select().from(projectsTable).where(eq(projectsTable.workspaceId, workspaceId)).all()
        : db.select().from(projectsTable).all();
      const items = rows.map(rowToProject);
      // Refresh the full cache so any orphaned entries are dropped.
      const allRows = workspaceId ? db.select().from(projectsTable).all() : rows;
      updateCache(allRows.map(rowToProject));
      return items;
    },

    async addProject(data) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const projectName = data.name ?? basename(data.path);

      db.insert(projectsTable).values({
        id,
        workspaceId: data.workspaceId ?? null,
        name: projectName,
        description: data.description ?? null,
        rootPath: data.path,
        gitUrl: data.gitUrl ?? null,
        repoStructure: data.repoStructure ?? 'single',
        defaultBranch: data.defaultBranch ?? 'main',
        createdAt: now,
        updatedAt: now,
      }).run();

      if (data.subProjects && data.subProjects.length > 0) {
        for (const sub of data.subProjects) {
          db.insert(subProjectsTable).values({
            id: crypto.randomUUID(),
            projectId: id,
            name: sub.name,
            relativePath: sub.relativePath,
            gitUrl: sub.gitUrl ?? null,
            defaultBranch: sub.defaultBranch ?? 'main',
            createdAt: now,
          }).run();
        }
      }

      const row = db.select().from(projectsTable).where(eq(projectsTable.id, id)).get();
      if (!row) throw new Error(`Failed to add project ${id}`);
      const project = rowToProject(row);
      cacheProject(project);
      return project;
    },

    async removeProject(projectId) {
      // Cascade by hand: delete sub_projects first, then the project.
      db.delete(subProjectsTable).where(eq(subProjectsTable.projectId, projectId)).run();
      db.delete(projectsTable).where(eq(projectsTable.id, projectId)).run();
      projectCache.delete(projectId);
      return { success: true };
    },

    async updateProject(data) {
      const { projectId, ...updates } = data;
      const patch: Partial<typeof projectsTable.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.description !== undefined) patch.description = updates.description;
      if (updates.gitUrl !== undefined) patch.gitUrl = updates.gitUrl;
      if (updates.defaultBranch !== undefined) patch.defaultBranch = updates.defaultBranch;
      if (updates.workspaceId !== undefined) patch.workspaceId = updates.workspaceId;

      db.update(projectsTable).set(patch).where(eq(projectsTable.id, projectId)).run();

      const row = db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).get();
      if (!row) throw new Error(`Project ${projectId} not found after update`);
      const project = rowToProject(row);
      cacheProject(project);
      return project;
    },

    async selectDirectory() {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Project Folder',
      });
      return { path: result.filePaths[0] ?? null };
    },

    async getSubProjects(projectId) {
      const rows = db
        .select()
        .from(subProjectsTable)
        .where(eq(subProjectsTable.projectId, projectId))
        .all();
      return rows.map(rowToSubProject);
    },

    async createSubProject(data) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.insert(subProjectsTable).values({
        id,
        projectId: data.projectId,
        name: data.name,
        relativePath: data.relativePath,
        gitUrl: data.gitUrl ?? null,
        defaultBranch: data.defaultBranch ?? 'main',
        createdAt: now,
      }).run();

      const row = db.select().from(subProjectsTable).where(eq(subProjectsTable.id, id)).get();
      if (!row) throw new Error(`Failed to create sub-project ${id}`);
      return rowToSubProject(row);
    },

    async deleteSubProject(projectId, subProjectId) {
      db.delete(subProjectsTable)
        .where(and(eq(subProjectsTable.id, subProjectId), eq(subProjectsTable.projectId, projectId)))
        .run();
      return { success: true };
    },
  };
}
