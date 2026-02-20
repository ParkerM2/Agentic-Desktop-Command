/**
 * Unit Tests — ProjectService (Hub API proxy)
 *
 * Tests CRUD operations, sub-project management, and local cache behavior.
 * The service proxies to Hub API via HubApiClient.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Project, SubProject } from '@shared/types';
import type { HubApiClient, HubApiResponse } from '@main/services/hub/hub-api-client';

// ─── Mock Hub API Client ─────────────────────────────────────────────

function createMockHubApiClient(): HubApiClient {
  return {
    hubGet: vi.fn(),
    hubPost: vi.fn(),
    hubPatch: vi.fn(),
    hubPut: vi.fn(),
    hubDelete: vi.fn(),
    listTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    pushProgress: vi.fn(),
    updateTaskStatus: vi.fn(),
    executeTask: vi.fn(),
    cancelTask: vi.fn(),
    registerDevice: vi.fn(),
    heartbeat: vi.fn(),
  };
}

function okResponse<T>(data: T): HubApiResponse<T> {
  return { ok: true, data, statusCode: 200 };
}

function errorResponse(error: string, statusCode = 500): HubApiResponse<never> {
  return { ok: false, error, statusCode };
}

// ─── Test Suite ───────────────────────────────────────────────────────

describe('ProjectService', () => {
  let hubApiClient: HubApiClient;

  beforeEach(() => {
    hubApiClient = createMockHubApiClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function createFreshService() {
    vi.resetModules();
    const { createProjectService } = await import(
      '@main/services/project/project-service'
    );
    return createProjectService({ hubApiClient });
  }

  // ─── listProjects Tests ─────────────────────────────────────────────

  describe('listProjects()', () => {
    it('returns projects from Hub API', async () => {
      const projects: Project[] = [
        {
          id: 'proj-1',
          name: 'Project One',
          path: '/path/to/one',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      vi.mocked(hubApiClient.hubGet).mockResolvedValueOnce(
        okResponse({ projects }),
      );

      const service = await createFreshService();
      const result = await service.listProjects();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('proj-1');
      expect(hubApiClient.hubGet).toHaveBeenCalledWith('/api/projects');
    });

    it('uses workspace-scoped endpoint when workspaceId provided', async () => {
      vi.mocked(hubApiClient.hubGet).mockResolvedValueOnce(
        okResponse({ projects: [] }),
      );

      const service = await createFreshService();
      await service.listProjects('ws-123');

      expect(hubApiClient.hubGet).toHaveBeenCalledWith(
        '/api/workspaces/ws-123/projects',
      );
    });

    it('throws on Hub API error', async () => {
      vi.mocked(hubApiClient.hubGet).mockResolvedValueOnce(
        errorResponse('Hub unreachable'),
      );

      const service = await createFreshService();
      await expect(service.listProjects()).rejects.toThrow('Hub unreachable');
    });

    it('populates local cache for getProjectPath', async () => {
      const projects: Project[] = [
        {
          id: 'proj-1',
          name: 'Project One',
          path: '/path/to/one',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      vi.mocked(hubApiClient.hubGet).mockResolvedValueOnce(
        okResponse({ projects }),
      );

      const service = await createFreshService();
      await service.listProjects();

      expect(service.getProjectPath('proj-1')).toBe('/path/to/one');
    });
  });

  // ─── addProject Tests ───────────────────────────────────────────────

  describe('addProject()', () => {
    it('sends project data to Hub API', async () => {
      const newProject: Project = {
        id: 'proj-new',
        name: 'New Project',
        path: '/path/to/new',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      vi.mocked(hubApiClient.hubPost).mockResolvedValueOnce(
        okResponse(newProject),
      );

      const service = await createFreshService();
      const result = await service.addProject({ path: '/path/to/new' });

      expect(result.id).toBe('proj-new');
      expect(hubApiClient.hubPost).toHaveBeenCalledWith('/api/projects', {
        path: '/path/to/new',
        name: 'new',
        description: undefined,
        repoStructure: undefined,
        gitUrl: undefined,
        defaultBranch: undefined,
        subProjects: undefined,
      });
    });

    it('uses workspace-scoped endpoint when workspaceId provided', async () => {
      const newProject: Project = {
        id: 'proj-ws',
        name: 'WS Project',
        path: '/path/to/ws',
        workspaceId: 'ws-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      vi.mocked(hubApiClient.hubPost).mockResolvedValueOnce(
        okResponse(newProject),
      );

      const service = await createFreshService();
      await service.addProject({ path: '/path/to/ws', workspaceId: 'ws-1' });

      expect(hubApiClient.hubPost).toHaveBeenCalledWith(
        '/api/workspaces/ws-1/projects',
        expect.objectContaining({ rootPath: '/path/to/ws' }),
      );
    });

    it('caches added project for sync access', async () => {
      const newProject: Project = {
        id: 'proj-cached',
        name: 'Cached Project',
        path: '/path/to/cached',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      vi.mocked(hubApiClient.hubPost).mockResolvedValueOnce(
        okResponse(newProject),
      );

      const service = await createFreshService();
      await service.addProject({ path: '/path/to/cached' });

      expect(service.getProjectPath('proj-cached')).toBe('/path/to/cached');
    });

    it('throws on Hub API error', async () => {
      vi.mocked(hubApiClient.hubPost).mockResolvedValueOnce(
        errorResponse('Duplicate project'),
      );

      const service = await createFreshService();
      await expect(
        service.addProject({ path: '/path/to/dup' }),
      ).rejects.toThrow('Duplicate project');
    });
  });

  // ─── removeProject Tests ────────────────────────────────────────────

  describe('removeProject()', () => {
    it('deletes project via Hub API', async () => {
      vi.mocked(hubApiClient.hubDelete).mockResolvedValueOnce({
        ok: true,
        statusCode: 204,
      });

      const service = await createFreshService();
      const result = await service.removeProject('proj-del');

      expect(result.success).toBe(true);
      expect(hubApiClient.hubDelete).toHaveBeenCalledWith('/api/projects/proj-del');
    });

    it('removes project from local cache', async () => {
      // First add a project to the cache
      const project: Project = {
        id: 'proj-cache-del',
        name: 'Cache Del',
        path: '/path/to/del',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      vi.mocked(hubApiClient.hubPost).mockResolvedValueOnce(okResponse(project));
      vi.mocked(hubApiClient.hubDelete).mockResolvedValueOnce({
        ok: true,
        statusCode: 204,
      });

      const service = await createFreshService();
      await service.addProject({ path: '/path/to/del' });
      expect(service.getProjectPath('proj-cache-del')).toBe('/path/to/del');

      await service.removeProject('proj-cache-del');
      expect(service.getProjectPath('proj-cache-del')).toBeUndefined();
    });

    it('throws on Hub API error', async () => {
      vi.mocked(hubApiClient.hubDelete).mockResolvedValueOnce(
        errorResponse('Not found', 404),
      );

      const service = await createFreshService();
      await expect(service.removeProject('proj-nf')).rejects.toThrow('Not found');
    });
  });

  // ─── updateProject Tests ────────────────────────────────────────────

  describe('updateProject()', () => {
    it('patches project via Hub API', async () => {
      const updated: Project = {
        id: 'proj-upd',
        name: 'Updated Name',
        path: '/path/to/upd',
        description: 'New description',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      };
      vi.mocked(hubApiClient.hubPatch).mockResolvedValueOnce(okResponse(updated));

      const service = await createFreshService();
      const result = await service.updateProject({
        projectId: 'proj-upd',
        name: 'Updated Name',
        description: 'New description',
      });

      expect(result.name).toBe('Updated Name');
      expect(hubApiClient.hubPatch).toHaveBeenCalledWith('/api/projects/proj-upd', {
        name: 'Updated Name',
        description: 'New description',
      });
    });

    it('updates local cache on success', async () => {
      const updated: Project = {
        id: 'proj-upd-cache',
        name: 'Updated',
        path: '/new/path',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      };
      vi.mocked(hubApiClient.hubPatch).mockResolvedValueOnce(okResponse(updated));

      const service = await createFreshService();
      await service.updateProject({ projectId: 'proj-upd-cache', name: 'Updated' });

      expect(service.getProjectPath('proj-upd-cache')).toBe('/new/path');
    });
  });

  // ─── getProjectPath Tests ───────────────────────────────────────────

  describe('getProjectPath()', () => {
    it('returns undefined when cache is empty', async () => {
      const service = await createFreshService();
      expect(service.getProjectPath('unknown')).toBeUndefined();
    });

    it('returns cached path after listProjects', async () => {
      const projects: Project[] = [
        {
          id: 'proj-path',
          name: 'Path Project',
          path: '/my/project',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      vi.mocked(hubApiClient.hubGet).mockResolvedValueOnce(
        okResponse({ projects }),
      );

      const service = await createFreshService();
      await service.listProjects();

      expect(service.getProjectPath('proj-path')).toBe('/my/project');
    });
  });

  // ─── listProjectsSync Tests ─────────────────────────────────────────

  describe('listProjectsSync()', () => {
    it('returns empty array when cache is empty', async () => {
      const service = await createFreshService();
      expect(service.listProjectsSync()).toEqual([]);
    });

    it('returns cached projects after listProjects call', async () => {
      const projects: Project[] = [
        {
          id: 'proj-sync',
          name: 'Sync Project',
          path: '/sync',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      vi.mocked(hubApiClient.hubGet).mockResolvedValueOnce(
        okResponse({ projects }),
      );

      const service = await createFreshService();
      await service.listProjects();

      const syncResult = service.listProjectsSync();
      expect(syncResult).toHaveLength(1);
      expect(syncResult[0]?.id).toBe('proj-sync');
    });
  });

  // ─── Sub-project Tests ──────────────────────────────────────────────

  describe('getSubProjects()', () => {
    it('fetches sub-projects from Hub API', async () => {
      const subProjects: SubProject[] = [
        {
          id: 'sub-1',
          projectId: 'proj-1',
          name: 'Frontend',
          relativePath: 'packages/frontend',
          defaultBranch: 'main',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      vi.mocked(hubApiClient.hubGet).mockResolvedValueOnce(
        okResponse({ subProjects }),
      );

      const service = await createFreshService();
      const result = await service.getSubProjects('proj-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Frontend');
      expect(hubApiClient.hubGet).toHaveBeenCalledWith(
        '/api/projects/proj-1/sub-projects',
      );
    });
  });

  describe('createSubProject()', () => {
    it('creates sub-project via Hub API', async () => {
      const subProject: SubProject = {
        id: 'sub-new',
        projectId: 'proj-1',
        name: 'Backend',
        relativePath: 'packages/backend',
        defaultBranch: 'main',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      vi.mocked(hubApiClient.hubPost).mockResolvedValueOnce(
        okResponse(subProject),
      );

      const service = await createFreshService();
      const result = await service.createSubProject({
        projectId: 'proj-1',
        name: 'Backend',
        relativePath: 'packages/backend',
        defaultBranch: 'main',
      });

      expect(result.name).toBe('Backend');
      expect(hubApiClient.hubPost).toHaveBeenCalledWith(
        '/api/projects/proj-1/sub-projects',
        {
          name: 'Backend',
          relativePath: 'packages/backend',
          defaultBranch: 'main',
        },
      );
    });
  });

  describe('deleteSubProject()', () => {
    it('deletes sub-project via Hub API', async () => {
      vi.mocked(hubApiClient.hubDelete).mockResolvedValueOnce({
        ok: true,
        statusCode: 204,
      });

      const service = await createFreshService();
      const result = await service.deleteSubProject('proj-1', 'sub-1');

      expect(result.success).toBe(true);
      expect(hubApiClient.hubDelete).toHaveBeenCalledWith(
        '/api/projects/proj-1/sub-projects/sub-1',
      );
    });

    it('throws on Hub API error', async () => {
      vi.mocked(hubApiClient.hubDelete).mockResolvedValueOnce(
        errorResponse('Sub-project not found', 404),
      );

      const service = await createFreshService();
      await expect(
        service.deleteSubProject('proj-1', 'sub-nf'),
      ).rejects.toThrow('Sub-project not found');
    });
  });

  // ─── selectDirectory Tests ──────────────────────────────────────────

  describe('selectDirectory()', () => {
    it('returns selected path from dialog', async () => {
      const service = await createFreshService();
      const result = await service.selectDirectory();

      // Dialog mock is configured in tests/setup/mocks/electron.ts
      expect(result.path).toBe('/mock/path');
    });

    it('returns null when dialog is canceled', async () => {
      const { dialog } = await import('electron');
      vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({
        canceled: true,
        filePaths: [],
      });

      const service = await createFreshService();
      const result = await service.selectDirectory();

      expect(result.path).toBeNull();
    });
  });
});
