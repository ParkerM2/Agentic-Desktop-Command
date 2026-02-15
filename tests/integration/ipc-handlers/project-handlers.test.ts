/**
 * Integration tests for project IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> service -> response
 * with Zod validation at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';
import type { Project } from '@shared/types';

import type { IpcRouter } from '@main/ipc/router';
import type { ProjectService } from '@main/services/project/project-service';

// ─── Mock Factory ──────────────────────────────────────────────

function createMockProject(overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString();
  return {
    id: 'test-project-1',
    name: 'Test Project',
    path: '/mock/projects/test',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockProjectService(projectStore: Map<string, Project>): ProjectService {
  return {
    listProjects: vi.fn(() => Array.from(projectStore.values())),
    addProject: vi.fn((path: string) => {
      const existing = Array.from(projectStore.values()).find((p) => p.path === path);
      if (existing) return existing;

      const now = new Date().toISOString();
      const project: Project = {
        id: `proj-${Date.now()}`,
        name: path.split('/').pop() ?? 'project',
        path,
        createdAt: now,
        updatedAt: now,
      };
      projectStore.set(project.id, project);
      return project;
    }),
    removeProject: vi.fn((projectId: string) => {
      projectStore.delete(projectId);
      return { success: true };
    }),
    initializeProject: vi.fn((projectId: string) => {
      const project = projectStore.get(projectId);
      if (!project) return { success: false, error: 'Project not found' };
      return { success: true };
    }),
    selectDirectory: vi.fn(() => Promise.resolve({ path: '/mock/selected/path' })),
    getProjectPath: vi.fn((projectId: string) => projectStore.get(projectId)?.path),
  };
}

// ─── Test Router Implementation ────────────────────────────────

/**
 * Creates a test IPC router that mimics real router behavior.
 * Handlers are registered and can be invoked with validation.
 */
function createTestRouter(): {
  router: IpcRouter;
  handlers: Map<string, (input: unknown) => Promise<unknown>>;
  invoke: (channel: string, input: unknown) => Promise<{ success: boolean; data?: unknown; error?: string }>;
} {
  const handlers = new Map<string, (input: unknown) => Promise<unknown>>();

  const router = {
    handle: (channel: string, handler: (input: unknown) => Promise<unknown>) => {
      handlers.set(channel, handler);
    },
    emit: vi.fn(),
  } as unknown as IpcRouter;

  const invoke = async (
    channel: string,
    input: unknown,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    const handler = handlers.get(channel);
    if (!handler) {
      return { success: false, error: `No handler for channel: ${channel}` };
    }

    const channelKey = channel as InvokeChannel;
    const schema = ipcInvokeContract[channelKey];

    try {
      const parsed = schema.input.parse(input ?? {});
      const result = await handler(parsed);
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  };

  return { router, handlers, invoke };
}

// ─── Tests ─────────────────────────────────────────────────────

describe('Project IPC Handlers', () => {
  let projectStore: Map<string, Project>;
  let projectService: ProjectService;
  let router: IpcRouter;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];

  beforeEach(async () => {
    projectStore = new Map();
    projectService = createMockProjectService(projectStore);

    const testRouter = createTestRouter();
    ({ router, invoke } = testRouter);

    // Dynamically import and register handlers
    const { registerProjectHandlers } = await import('@main/ipc/handlers/project-handlers');
    registerProjectHandlers(router, projectService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── projects.list ───────────────────────────────────────────

  describe('projects.list', () => {
    it('returns empty array when no projects exist', async () => {
      const result = await invoke('projects.list', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(projectService.listProjects).toHaveBeenCalledOnce();
    });

    it('returns array of projects', async () => {
      const project1 = createMockProject({ id: 'proj-1', name: 'Project One' });
      const project2 = createMockProject({ id: 'proj-2', name: 'Project Two' });
      projectStore.set(project1.id, project1);
      projectStore.set(project2.id, project2);

      const result = await invoke('projects.list', {});

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('accepts empty input object', async () => {
      const result = await invoke('projects.list', {});

      expect(result.success).toBe(true);
    });

    it('accepts undefined input', async () => {
      const result = await invoke('projects.list', null);

      expect(result.success).toBe(true);
    });
  });

  // ─── projects.add ────────────────────────────────────────────

  describe('projects.add', () => {
    it('adds project and returns it', async () => {
      const result = await invoke('projects.add', { path: '/mock/new/project' });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        path: '/mock/new/project',
        name: 'project',
      });
      expect(projectService.addProject).toHaveBeenCalledWith('/mock/new/project');
    });

    it('validates input with Zod - missing path', async () => {
      const result = await invoke('projects.add', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('path');
    });

    it('validates input with Zod - path must be string', async () => {
      const result = await invoke('projects.add', { path: 123 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates input with Zod - null path', async () => {
      const result = await invoke('projects.add', { path: null });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns existing project for duplicate path', async () => {
      const existingProject = createMockProject({ id: 'existing-1', path: '/existing/path' });
      projectStore.set(existingProject.id, existingProject);

      const result = await invoke('projects.add', { path: '/existing/path' });

      expect(result.success).toBe(true);
      expect((result.data as Project).id).toBe('existing-1');
    });
  });

  // ─── projects.remove ─────────────────────────────────────────

  describe('projects.remove', () => {
    it('removes project by ID', async () => {
      const project = createMockProject({ id: 'remove-me' });
      projectStore.set(project.id, project);

      const result = await invoke('projects.remove', { projectId: 'remove-me' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(projectService.removeProject).toHaveBeenCalledWith('remove-me');
    });

    it('validates input with Zod - missing projectId', async () => {
      const result = await invoke('projects.remove', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectId');
    });

    it('succeeds even for non-existent project', async () => {
      const result = await invoke('projects.remove', { projectId: 'non-existent' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
    });
  });

  // ─── projects.initialize ─────────────────────────────────────

  describe('projects.initialize', () => {
    it('initializes existing project', async () => {
      const project = createMockProject({ id: 'init-me' });
      projectStore.set(project.id, project);

      const result = await invoke('projects.initialize', { projectId: 'init-me' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(projectService.initializeProject).toHaveBeenCalledWith('init-me');
    });

    it('returns error for non-existent project', async () => {
      const result = await invoke('projects.initialize', { projectId: 'non-existent' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: false, error: 'Project not found' });
    });

    it('validates input with Zod - missing projectId', async () => {
      const result = await invoke('projects.initialize', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectId');
    });
  });

  // ─── projects.selectDirectory ────────────────────────────────

  describe('projects.selectDirectory', () => {
    it('returns selected directory path', async () => {
      const result = await invoke('projects.selectDirectory', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ path: '/mock/selected/path' });
      expect(projectService.selectDirectory).toHaveBeenCalledOnce();
    });

    it('handles canceled dialog', async () => {
      vi.mocked(projectService.selectDirectory).mockResolvedValueOnce({ path: null });

      const result = await invoke('projects.selectDirectory', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ path: null });
    });
  });

  // ─── projects.detectRepo ─────────────────────────────────────

  describe('projects.detectRepo', () => {
    it('validates input with Zod - missing path', async () => {
      const result = await invoke('projects.detectRepo', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('path');
    });

    it('validates input with Zod - path must be string', async () => {
      const result = await invoke('projects.detectRepo', { path: 42 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
