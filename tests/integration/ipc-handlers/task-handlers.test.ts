/**
 * Integration tests for task IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> TaskRepository -> response
 * with Zod validation at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';

import type { IpcRouter } from '@main/ipc/router';
import type { Task as HubTask, TaskCancelResponse, TaskExecuteResponse } from '@shared/types/hub-protocol';
import type { TaskRepository } from '@main/services/tasks/types';

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

function createMockTaskRepository(): TaskRepository {
  return {
    listTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
    executeTask: vi.fn(),
    cancelTask: vi.fn(),
  };
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
  let taskRepository: TaskRepository;
  let router: IpcRouter;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];

  beforeEach(async () => {
    taskRepository = createMockTaskRepository();

    const testRouter = createTestRouter();
    ({ router, invoke } = testRouter);

    // Dynamically import and register handlers
    const { registerTaskHandlers } = await import('@main/ipc/handlers/task-handlers');
    registerTaskHandlers(router, taskRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── tasks.list ──────────────────────────────────────────────

  describe('tasks.list', () => {
    it('returns tasks for project', async () => {
      const tasks = [createMockHubTask({ id: 'task-1' }), createMockHubTask({ id: 'task-2' })];
      vi.mocked(taskRepository.listTasks).mockResolvedValue({ tasks });

      const result = await invoke('tasks.list', { projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(taskRepository.listTasks).toHaveBeenCalledWith({ projectId: 'project-1' });
    });

    it('returns empty array for project with no tasks', async () => {
      vi.mocked(taskRepository.listTasks).mockResolvedValue({ tasks: [] });

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

    it('throws on TaskRepository error', async () => {
      vi.mocked(taskRepository.listTasks).mockRejectedValue(new Error('Connection refused'));

      const result = await invoke('tasks.list', { projectId: 'project-1' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });

  // ─── tasks.create ────────────────────────────────────────────

  describe('tasks.create', () => {
    it('creates task with required fields', async () => {
      const hubTask = createMockHubTask({ title: 'New Task' });
      vi.mocked(taskRepository.createTask).mockResolvedValue(hubTask);

      const result = await invoke('tasks.create', {
        title: 'New Task',
        description: 'Task description',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(taskRepository.createTask).toHaveBeenCalledWith({
        projectId: 'project-1',
        title: 'New Task',
        description: 'Task description',
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
      vi.mocked(taskRepository.updateTask).mockResolvedValue(updatedTask);

      const result = await invoke('tasks.update', {
        taskId: 'update-me',
        updates: { title: 'Updated Title' },
      });

      expect(result.success).toBe(true);
      expect(taskRepository.updateTask).toHaveBeenCalledWith('update-me', { title: 'Updated Title' });
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

    it('handles TaskRepository error for non-existent task', async () => {
      vi.mocked(taskRepository.updateTask).mockRejectedValue(new Error('Task not found'));

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
      const updatedTask = createMockHubTask({ id: 'status-task', status: 'running' });
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(updatedTask);

      const result = await invoke('tasks.updateStatus', {
        taskId: 'status-task',
        status: 'running',
      });

      expect(result.success).toBe(true);
      // Status is now unified — 'running' passes through directly
      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith('status-task', 'running');
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
      vi.mocked(taskRepository.deleteTask).mockResolvedValue({ success: true });

      const result = await invoke('tasks.delete', {
        taskId: 'delete-me',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(taskRepository.deleteTask).toHaveBeenCalledWith('delete-me');
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
      vi.mocked(taskRepository.getTask).mockResolvedValue(hubTask);

      const result = await invoke('tasks.get', {
        projectId: 'project-1',
        taskId: 'get-me',
      });

      expect(result.success).toBe(true);
      expect(taskRepository.getTask).toHaveBeenCalledWith('get-me');
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

    it('handles TaskRepository error for non-existent task', async () => {
      vi.mocked(taskRepository.getTask).mockRejectedValue(new Error('Task not found'));

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
      vi.mocked(taskRepository.listTasks).mockResolvedValue({ tasks });

      const result = await invoke('tasks.listAll', {});

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(taskRepository.listTasks).toHaveBeenCalledWith();
    });

    it('returns empty array when no tasks exist', async () => {
      vi.mocked(taskRepository.listTasks).mockResolvedValue({ tasks: [] });

      const result = await invoke('tasks.listAll', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ─── tasks.execute ───────────────────────────────────────────

  describe('tasks.execute', () => {
    it('starts agent for task via TaskRepository', async () => {
      const response: TaskExecuteResponse = { sessionId: 'session-123', status: 'started' };
      vi.mocked(taskRepository.executeTask).mockResolvedValue(response);

      const result = await invoke('tasks.execute', {
        taskId: 'exec-task',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ agentId: 'session-123' });
      expect(taskRepository.executeTask).toHaveBeenCalledWith('exec-task');
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
      vi.mocked(taskRepository.listTasks).mockResolvedValue({ tasks });

      const result = await invoke('hub.tasks.list', { projectId: 'p1' });

      expect(result.success).toBe(true);
      expect(taskRepository.listTasks).toHaveBeenCalledWith({ projectId: 'p1' });
    });

    it('returns all tasks when no filter', async () => {
      vi.mocked(taskRepository.listTasks).mockResolvedValue({ tasks: [] });

      const result = await invoke('hub.tasks.list', {});

      expect(result.success).toBe(true);
      expect(taskRepository.listTasks).toHaveBeenCalledWith({});
    });
  });

  describe('hub.tasks.get', () => {
    it('returns task by ID', async () => {
      const hubTask = createMockHubTask({ id: 'hub-task-1' });
      vi.mocked(taskRepository.getTask).mockResolvedValue(hubTask);

      const result = await invoke('hub.tasks.get', { taskId: 'hub-task-1' });

      expect(result.success).toBe(true);
      expect(taskRepository.getTask).toHaveBeenCalledWith('hub-task-1');
    });
  });

  describe('hub.tasks.create', () => {
    it('creates task via TaskRepository', async () => {
      const hubTask = createMockHubTask({ title: 'Hub Task' });
      vi.mocked(taskRepository.createTask).mockResolvedValue(hubTask);

      const result = await invoke('hub.tasks.create', {
        projectId: 'p1',
        title: 'Hub Task',
        description: 'Description',
      });

      expect(result.success).toBe(true);
      expect(taskRepository.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Hub Task', projectId: 'p1' }),
      );
    });
  });

  describe('hub.tasks.delete', () => {
    it('deletes task via TaskRepository', async () => {
      vi.mocked(taskRepository.deleteTask).mockResolvedValue({ success: true });

      const result = await invoke('hub.tasks.delete', { taskId: 'del-1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(taskRepository.deleteTask).toHaveBeenCalledWith('del-1');
    });
  });

  describe('hub.tasks.execute', () => {
    it('executes task via TaskRepository', async () => {
      const response: TaskExecuteResponse = { sessionId: 'sess-1', status: 'started' };
      vi.mocked(taskRepository.executeTask).mockResolvedValue(response);

      const result = await invoke('hub.tasks.execute', { taskId: 'exec-1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sessionId: 'sess-1', status: 'started' });
    });
  });

  describe('hub.tasks.cancel', () => {
    it('cancels task via TaskRepository', async () => {
      const response: TaskCancelResponse = { success: true, previousStatus: 'running' };
      vi.mocked(taskRepository.cancelTask).mockResolvedValue(response);

      const result = await invoke('hub.tasks.cancel', { taskId: 'cancel-1', reason: 'user request' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, previousStatus: 'running' });
      expect(taskRepository.cancelTask).toHaveBeenCalledWith('cancel-1', 'user request');
    });
  });
});
