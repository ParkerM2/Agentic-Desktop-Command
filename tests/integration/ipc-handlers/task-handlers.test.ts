/**
 * Integration tests for task IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> Hub API client -> response
 * with Zod validation at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';

import type { IpcRouter } from '@main/ipc/router';
import type { HubApiClient, HubApiResponse } from '@main/services/hub/hub-api-client';
import type { Task as HubTask, TaskCancelResponse, TaskExecuteResponse } from '@shared/types/hub-protocol';

// ─── Mock Factory ──────────────────────────────────────────────

function createMockHubTask(overrides: Partial<HubTask> = {}): HubTask {
  const now = new Date().toISOString();
  return {
    id: 'test-task-1',
    title: 'Test Task',
    description: 'A test task description',
    status: 'backlog',
    projectId: 'project-1',
    priority: 'normal',
    createdByDeviceId: 'device-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function ok<T>(data: T): HubApiResponse<T> {
  return { ok: true, data, statusCode: 200 };
}

function err<T>(error: string): HubApiResponse<T> {
  return { ok: false, error, statusCode: 500 };
}

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
  } as unknown as HubApiClient;
}

// ─── Test Router Implementation ────────────────────────────────

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

describe('Task IPC Handlers', () => {
  let hubApiClient: HubApiClient;
  let router: IpcRouter;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];

  beforeEach(async () => {
    hubApiClient = createMockHubApiClient();

    const testRouter = createTestRouter();
    ({ router, invoke } = testRouter);

    // Dynamically import and register handlers
    const { registerTaskHandlers } = await import('@main/ipc/handlers/task-handlers');
    registerTaskHandlers(router, hubApiClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── tasks.list ──────────────────────────────────────────────

  describe('tasks.list', () => {
    it('returns tasks for project', async () => {
      const tasks = [createMockHubTask({ id: 'task-1' }), createMockHubTask({ id: 'task-2' })];
      vi.mocked(hubApiClient.listTasks).mockResolvedValue(ok({ tasks }));

      const result = await invoke('tasks.list', { projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(hubApiClient.listTasks).toHaveBeenCalledWith({ project_id: 'project-1' });
    });

    it('returns empty array for project with no tasks', async () => {
      vi.mocked(hubApiClient.listTasks).mockResolvedValue(ok({ tasks: [] }));

      const result = await invoke('tasks.list', { projectId: 'empty-project' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('validates input with Zod - missing projectId', async () => {
      const result = await invoke('tasks.list', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectId');
    });

    it('validates input with Zod - projectId must be string', async () => {
      const result = await invoke('tasks.list', { projectId: 123 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('throws on Hub API error', async () => {
      vi.mocked(hubApiClient.listTasks).mockResolvedValue(err('Connection refused'));

      const result = await invoke('tasks.list', { projectId: 'project-1' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });

  // ─── tasks.create ────────────────────────────────────────────

  describe('tasks.create', () => {
    it('creates task with required fields', async () => {
      const hubTask = createMockHubTask({ title: 'New Task' });
      vi.mocked(hubApiClient.createTask).mockResolvedValue(ok(hubTask));

      const result = await invoke('tasks.create', {
        title: 'New Task',
        description: 'Task description',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(hubApiClient.createTask).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'Task description',
        projectId: 'project-1',
      });
    });

    it('validates input with Zod - missing title', async () => {
      const result = await invoke('tasks.create', {
        description: 'Task without title',
        projectId: 'project-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('title');
    });

    it('validates input with Zod - empty title', async () => {
      const result = await invoke('tasks.create', {
        title: '',
        description: 'Task with empty title',
        projectId: 'project-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates input with Zod - missing projectId', async () => {
      const result = await invoke('tasks.create', {
        title: 'Task Title',
        description: 'Description',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectId');
    });
  });

  // ─── tasks.update ────────────────────────────────────────────

  describe('tasks.update', () => {
    it('updates task fields', async () => {
      const updatedTask = createMockHubTask({ id: 'update-me', title: 'Updated Title' });
      vi.mocked(hubApiClient.updateTask).mockResolvedValue(ok(updatedTask));

      const result = await invoke('tasks.update', {
        taskId: 'update-me',
        updates: { title: 'Updated Title' },
      });

      expect(result.success).toBe(true);
      expect(hubApiClient.updateTask).toHaveBeenCalledWith('update-me', { title: 'Updated Title' });
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('tasks.update', {
        updates: { title: 'New Title' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });

    it('validates input with Zod - missing updates', async () => {
      const result = await invoke('tasks.update', {
        taskId: 'task-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('updates');
    });

    it('handles Hub API error for non-existent task', async () => {
      vi.mocked(hubApiClient.updateTask).mockResolvedValue(err('Task not found'));

      const result = await invoke('tasks.update', {
        taskId: 'non-existent',
        updates: { title: 'New Title' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ─── tasks.updateStatus ──────────────────────────────────────

  describe('tasks.updateStatus', () => {
    it('changes task status', async () => {
      const updatedTask = createMockHubTask({ id: 'status-task', status: 'queued' });
      vi.mocked(hubApiClient.updateTaskStatus).mockResolvedValue(ok(updatedTask));

      const result = await invoke('tasks.updateStatus', {
        taskId: 'status-task',
        status: 'in_progress',
      });

      expect(result.success).toBe(true);
      expect(hubApiClient.updateTaskStatus).toHaveBeenCalledWith('status-task', 'in_progress');
    });

    it('validates input with Zod - invalid status', async () => {
      const result = await invoke('tasks.updateStatus', {
        taskId: 'task-1',
        status: 'invalid_status',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('tasks.updateStatus', {
        status: 'done',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });

    it('validates input with Zod - missing status', async () => {
      const result = await invoke('tasks.updateStatus', {
        taskId: 'task-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('status');
    });
  });

  // ─── tasks.delete ────────────────────────────────────────────

  describe('tasks.delete', () => {
    it('deletes task', async () => {
      vi.mocked(hubApiClient.deleteTask).mockResolvedValue(ok({ success: true }));

      const result = await invoke('tasks.delete', {
        taskId: 'delete-me',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(hubApiClient.deleteTask).toHaveBeenCalledWith('delete-me');
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('tasks.delete', {
        projectId: 'project-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });

    it('validates input with Zod - missing projectId', async () => {
      const result = await invoke('tasks.delete', {
        taskId: 'task-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectId');
    });
  });

  // ─── tasks.get ───────────────────────────────────────────────

  describe('tasks.get', () => {
    it('returns task by ID', async () => {
      const hubTask = createMockHubTask({ id: 'get-me', title: 'Get This Task' });
      vi.mocked(hubApiClient.getTask).mockResolvedValue(ok(hubTask));

      const result = await invoke('tasks.get', {
        projectId: 'project-1',
        taskId: 'get-me',
      });

      expect(result.success).toBe(true);
      expect(hubApiClient.getTask).toHaveBeenCalledWith('get-me');
    });

    it('validates input with Zod - missing projectId', async () => {
      const result = await invoke('tasks.get', {
        taskId: 'task-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectId');
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('tasks.get', {
        projectId: 'project-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });

    it('handles Hub API error for non-existent task', async () => {
      vi.mocked(hubApiClient.getTask).mockResolvedValue(err('Task not found'));

      const result = await invoke('tasks.get', {
        projectId: 'project-1',
        taskId: 'non-existent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  // ─── tasks.listAll ───────────────────────────────────────────

  describe('tasks.listAll', () => {
    it('returns all tasks across projects', async () => {
      const tasks = [
        createMockHubTask({ id: 'task-1', projectId: 'project-1' }),
        createMockHubTask({ id: 'task-2', projectId: 'project-2' }),
      ];
      vi.mocked(hubApiClient.listTasks).mockResolvedValue(ok({ tasks }));

      const result = await invoke('tasks.listAll', {});

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(hubApiClient.listTasks).toHaveBeenCalledWith();
    });

    it('returns empty array when no tasks exist', async () => {
      vi.mocked(hubApiClient.listTasks).mockResolvedValue(ok({ tasks: [] }));

      const result = await invoke('tasks.listAll', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ─── tasks.execute ───────────────────────────────────────────

  describe('tasks.execute', () => {
    it('starts agent for task via Hub', async () => {
      const response: TaskExecuteResponse = { sessionId: 'session-123', status: 'started' };
      vi.mocked(hubApiClient.executeTask).mockResolvedValue(ok(response));

      const result = await invoke('tasks.execute', {
        taskId: 'exec-task',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ agentId: 'session-123' });
      expect(hubApiClient.executeTask).toHaveBeenCalledWith('exec-task');
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('tasks.execute', {
        projectId: 'project-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });

    it('validates input with Zod - missing projectId', async () => {
      const result = await invoke('tasks.execute', {
        taskId: 'task-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectId');
    });
  });

  // ─── Hub task channels ──────────────────────────────────────

  describe('hub.tasks.list', () => {
    it('returns tasks with project filter', async () => {
      const tasks = [createMockHubTask()];
      vi.mocked(hubApiClient.listTasks).mockResolvedValue(ok({ tasks }));

      const result = await invoke('hub.tasks.list', { projectId: 'p1' });

      expect(result.success).toBe(true);
      expect(hubApiClient.listTasks).toHaveBeenCalledWith({ project_id: 'p1' });
    });

    it('returns all tasks when no filter', async () => {
      vi.mocked(hubApiClient.listTasks).mockResolvedValue(ok({ tasks: [] }));

      const result = await invoke('hub.tasks.list', {});

      expect(result.success).toBe(true);
      expect(hubApiClient.listTasks).toHaveBeenCalledWith({});
    });
  });

  describe('hub.tasks.get', () => {
    it('returns task by ID', async () => {
      const hubTask = createMockHubTask({ id: 'hub-task-1' });
      vi.mocked(hubApiClient.getTask).mockResolvedValue(ok(hubTask));

      const result = await invoke('hub.tasks.get', { taskId: 'hub-task-1' });

      expect(result.success).toBe(true);
      expect(hubApiClient.getTask).toHaveBeenCalledWith('hub-task-1');
    });
  });

  describe('hub.tasks.create', () => {
    it('creates task via Hub API', async () => {
      const hubTask = createMockHubTask({ title: 'Hub Task' });
      vi.mocked(hubApiClient.createTask).mockResolvedValue(ok(hubTask));

      const result = await invoke('hub.tasks.create', {
        projectId: 'p1',
        title: 'Hub Task',
        description: 'Description',
      });

      expect(result.success).toBe(true);
      expect(hubApiClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Hub Task', projectId: 'p1' }),
      );
    });
  });

  describe('hub.tasks.delete', () => {
    it('deletes task via Hub API', async () => {
      vi.mocked(hubApiClient.deleteTask).mockResolvedValue(ok({ success: true }));

      const result = await invoke('hub.tasks.delete', { taskId: 'del-1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(hubApiClient.deleteTask).toHaveBeenCalledWith('del-1');
    });
  });

  describe('hub.tasks.execute', () => {
    it('executes task via Hub API', async () => {
      const response: TaskExecuteResponse = { sessionId: 'sess-1', status: 'started' };
      vi.mocked(hubApiClient.executeTask).mockResolvedValue(ok(response));

      const result = await invoke('hub.tasks.execute', { taskId: 'exec-1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sessionId: 'sess-1', status: 'started' });
    });
  });

  describe('hub.tasks.cancel', () => {
    it('cancels task via Hub API', async () => {
      const response: TaskCancelResponse = { success: true, previousStatus: 'running' };
      vi.mocked(hubApiClient.cancelTask).mockResolvedValue(ok(response));

      const result = await invoke('hub.tasks.cancel', { taskId: 'cancel-1', reason: 'user request' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, previousStatus: 'running' });
      expect(hubApiClient.cancelTask).toHaveBeenCalledWith('cancel-1', 'user request');
    });
  });
});
