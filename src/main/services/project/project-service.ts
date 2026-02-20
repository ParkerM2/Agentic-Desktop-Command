/**
 * Project Service — Hub API proxy with local cache
 *
 * Projects are persisted via Hub API. A local in-memory cache allows
 * synchronous path resolution for services that depend on getProjectPath().
 * The selectDirectory() and detectRepoStructure() remain local Electron operations.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import { dialog } from 'electron';

import type { Project, SubProject } from '@shared/types';

import type { HubApiClient } from '../hub/hub-api-client';

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

// ─── Factory ─────────────────────────────────────────────────

export function createProjectService(deps: {
  hubApiClient: HubApiClient;
}): ProjectService {
  const { hubApiClient } = deps;

  // Local cache for sync access by dependent services
  const projectCache = new Map<string, Project>();

  /** Update the local cache from an array of projects */
  function updateCache(projects: Project[]): void {
    projectCache.clear();
    for (const p of projects) {
      cacheProject(p);
    }
  }

  /** Add or update a single project in the cache.
   *  Hub API returns `rootPath` while local code expects `path` —
   *  normalize here so getProjectPath() always works. */
  function cacheProject(project: Project): void {
    const raw = project as unknown as Record<string, unknown>;
    const normalized: Project = {
      ...project,
      path: project.path || (raw.rootPath as string) || '',
    };
    projectCache.set(normalized.id, normalized);
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
      const endpoint = workspaceId
        ? `/api/workspaces/${encodeURIComponent(workspaceId)}/projects`
        : '/api/projects';

      // Workspace endpoint returns { projects: [...] }, legacy returns raw array
      const result = await hubApiClient.hubGet<Project[] | { projects: Project[] }>(endpoint);

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? 'Failed to fetch projects');
      }

      const projects = Array.isArray(result.data) ? result.data : result.data.projects;
      updateCache(projects);
      return projects;
    },

    async addProject(data) {
      const endpoint = data.workspaceId
        ? `/api/workspaces/${encodeURIComponent(data.workspaceId)}/projects`
        : '/api/projects';

      const projectName = data.name ?? basename(data.path);

      const body = data.workspaceId
        ? {
            rootPath: data.path,
            name: projectName,
            description: data.description,
            repoStructure: data.repoStructure ?? 'single',
            gitUrl: data.gitUrl,
            defaultBranch: data.defaultBranch,
            subProjects: data.subProjects,
          }
        : {
            path: data.path,
            name: projectName,
            description: data.description,
            repoStructure: data.repoStructure,
            gitUrl: data.gitUrl,
            defaultBranch: data.defaultBranch,
            subProjects: data.subProjects,
          };

      const result = await hubApiClient.hubPost<Project>(endpoint, body);

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? 'Failed to add project');
      }

      cacheProject(result.data);
      return result.data;
    },

    async removeProject(projectId) {
      const result = await hubApiClient.hubDelete(
        `/api/projects/${encodeURIComponent(projectId)}`,
      );

      if (!result.ok) {
        throw new Error(result.error ?? `Failed to remove project ${projectId}`);
      }

      projectCache.delete(projectId);
      return { success: true };
    },

    async updateProject(data) {
      const { projectId, ...updates } = data;
      const result = await hubApiClient.hubPatch<Project>(
        `/api/projects/${encodeURIComponent(projectId)}`,
        updates,
      );

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to update project ${projectId}`);
      }

      cacheProject(result.data);
      return result.data;
    },

    async selectDirectory() {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Project Folder',
      });
      return { path: result.filePaths[0] ?? null };
    },

    async getSubProjects(projectId) {
      const result = await hubApiClient.hubGet<{ subProjects: SubProject[] }>(
        `/api/projects/${encodeURIComponent(projectId)}/sub-projects`,
      );

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to fetch sub-projects for ${projectId}`);
      }

      return result.data.subProjects;
    },

    async createSubProject(data) {
      const { projectId, ...body } = data;
      const result = await hubApiClient.hubPost<SubProject>(
        `/api/projects/${encodeURIComponent(projectId)}/sub-projects`,
        body,
      );

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to create sub-project for ${projectId}`);
      }

      return result.data;
    },

    async deleteSubProject(projectId, subProjectId) {
      const result = await hubApiClient.hubDelete(
        `/api/projects/${encodeURIComponent(projectId)}/sub-projects/${encodeURIComponent(subProjectId)}`,
      );

      if (!result.ok) {
        throw new Error(
          result.error ?? `Failed to delete sub-project ${subProjectId}`,
        );
      }

      return { success: true };
    },
  };
}
