/**
 * Integration tests for task IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> service -> response
 * with Zod validation at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';
import type { Task, TaskStatus } from '@shared/types';

import type { IpcRouter } from '@main/ipc/router';
import type { AgentService } from '@main/services/agent/agent-service';
import type { ProjectService } from '@main/services/project/project-service';
import type { TaskService } from '@main/services/project/task-service';

// ─── Mock Factory ──────────────────────────────────────────────

function createMockTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'test-task-1',
    specId: 'test-task-1',
    title: 'Test Task',
    description: 'A test task description',
    status: 'backlog',
    subtasks: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

interface TaskStore {
  tasks: Map<string, Task>;
  projectTasks: Map<string, Set<string>>; // projectId -> taskIds
}

function createMockTaskService(store: TaskStore): TaskService {
  return {
    listTasks: vi.fn((projectId: string) => {
      const taskIds = store.projectTasks.get(projectId) ?? new Set();
      return Array.from(taskIds)
        .map((id) => store.tasks.get(id))
        .filter((t): t is Task => t !== undefined);
    }),

    listAllTasks: vi.fn(() => Array.from(store.tasks.values())),

    getTask: vi.fn((projectId: string, taskId: string) => {
      const task = store.tasks.get(taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);
      return task;
    }),

    createTask: vi.fn((draft: { title: string; description: string; projectId: string; complexity?: string }) => {
      const now = new Date().toISOString();
      const taskId = `task-${Date.now()}`;
      const task: Task = {
        id: taskId,
        specId: taskId,
        title: draft.title,
        description: draft.description,
        status: 'backlog',
        subtasks: [],
        createdAt: now,
        updatedAt: now,
      };
      store.tasks.set(taskId, task);

      const projectTasks = store.projectTasks.get(draft.projectId) ?? new Set();
      projectTasks.add(taskId);
      store.projectTasks.set(draft.projectId, projectTasks);

      return task;
    }),

    updateTask: vi.fn((taskId: string, updates: Record<string, unknown>) => {
      const task = store.tasks.get(taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);

      const updatedTask: Task = {
        ...task,
        ...(updates as Partial<Task>),
        updatedAt: new Date().toISOString(),
      };
      store.tasks.set(taskId, updatedTask);
      return updatedTask;
    }),

    updateTaskStatus: vi.fn((taskId: string, status: TaskStatus) => {
      const task = store.tasks.get(taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);

      const updatedTask: Task = {
        ...task,
        status,
        updatedAt: new Date().toISOString(),
      };
      store.tasks.set(taskId, updatedTask);
      return updatedTask;
    }),

    deleteTask: vi.fn((projectId: string, taskId: string) => {
      store.tasks.delete(taskId);
      store.projectTasks.get(projectId)?.delete(taskId);
    }),

    executeTask: vi.fn((_projectId: string, taskId: string) => ({
      agentId: `agent-${taskId}-${Date.now()}`,
    })),
  };
}

function createMockProjectService(projectPaths: Map<string, string>): ProjectService {
  return {
    listProjects: vi.fn(() => []),
    addProject: vi.fn(),
    removeProject: vi.fn(() => ({ success: true })),
    initializeProject: vi.fn(() => ({ success: true })),
    selectDirectory: vi.fn(() => Promise.resolve({ path: null })),
    getProjectPath: vi.fn((projectId: string) => projectPaths.get(projectId)),
  } as unknown as ProjectService;
}

function createMockAgentService(): AgentService {
  return {
    startAgent: vi.fn((taskId: string, projectId: string, _projectPath: string) => ({
      session: { id: `agent-${taskId}`, taskId, projectId, status: 'running' as const },
    })),
    stopAgent: vi.fn(() => true),
    pauseAgent: vi.fn(() => true),
    resumeAgent: vi.fn(() => true),
    listAgents: vi.fn(() => []),
    listAllAgents: vi.fn(() => []),
    getQueueStatus: vi.fn(() => ({
      pending: [],
      running: [],
      maxConcurrent: 2,
    })),
    getAggregatedTokenUsage: vi.fn(() => ({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      byAgent: [],
    })),
  } as unknown as AgentService;
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
  let taskStore: TaskStore;
  let taskService: TaskService;
  let projectService: ProjectService;
  let agentService: AgentService;
  let router: IpcRouter;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];
  let projectPaths: Map<string, string>;

  beforeEach(async () => {
    taskStore = {
      tasks: new Map(),
      projectTasks: new Map(),
    };
    projectPaths = new Map([
      ['project-1', '/mock/projects/project-1'],
      ['project-2', '/mock/projects/project-2'],
    ]);

    taskService = createMockTaskService(taskStore);
    projectService = createMockProjectService(projectPaths);
    agentService = createMockAgentService();

    const testRouter = createTestRouter();
    ({ router, invoke } = testRouter);

    // Dynamically import and register handlers
    const { registerTaskHandlers } = await import('@main/ipc/handlers/task-handlers');
    registerTaskHandlers(router, taskService, agentService, projectService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── tasks.list ──────────────────────────────────────────────

  describe('tasks.list', () => {
    it('returns tasks for project', async () => {
      const task1 = createMockTask({ id: 'task-1', title: 'Task One' });
      const task2 = createMockTask({ id: 'task-2', title: 'Task Two' });
      taskStore.tasks.set(task1.id, task1);
      taskStore.tasks.set(task2.id, task2);
      taskStore.projectTasks.set('project-1', new Set(['task-1', 'task-2']));

      const result = await invoke('tasks.list', { projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(taskService.listTasks).toHaveBeenCalledWith('project-1');
    });

    it('returns empty array for project with no tasks', async () => {
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
  });

  // ─── tasks.create ────────────────────────────────────────────

  describe('tasks.create', () => {
    it('creates task with required fields', async () => {
      const result = await invoke('tasks.create', {
        title: 'New Task',
        description: 'Task description',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        title: 'New Task',
        description: 'Task description',
        status: 'backlog',
      });
      expect(taskService.createTask).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'Task description',
        projectId: 'project-1',
      });
    });

    it('creates task with optional complexity', async () => {
      const result = await invoke('tasks.create', {
        title: 'Complex Task',
        description: 'A complex task',
        projectId: 'project-1',
        complexity: 'complex',
      });

      expect(result.success).toBe(true);
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ complexity: 'complex' }),
      );
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

    it('validates input with Zod - invalid complexity', async () => {
      const result = await invoke('tasks.create', {
        title: 'Task',
        description: 'Description',
        projectId: 'project-1',
        complexity: 'invalid-complexity',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ─── tasks.update ────────────────────────────────────────────

  describe('tasks.update', () => {
    it('updates task fields', async () => {
      const task = createMockTask({ id: 'update-me', title: 'Original Title' });
      taskStore.tasks.set(task.id, task);
      taskStore.projectTasks.set('project-1', new Set(['update-me']));

      const result = await invoke('tasks.update', {
        taskId: 'update-me',
        updates: { title: 'Updated Title' },
      });

      expect(result.success).toBe(true);
      expect((result.data as Task).title).toBe('Updated Title');
      expect(taskService.updateTask).toHaveBeenCalledWith('update-me', { title: 'Updated Title' });
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

    it('handles service error for non-existent task', async () => {
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
      const task = createMockTask({ id: 'status-task', status: 'backlog' });
      taskStore.tasks.set(task.id, task);
      taskStore.projectTasks.set('project-1', new Set(['status-task']));

      const result = await invoke('tasks.updateStatus', {
        taskId: 'status-task',
        status: 'in_progress',
      });

      expect(result.success).toBe(true);
      expect((result.data as Task).status).toBe('in_progress');
      expect(taskService.updateTaskStatus).toHaveBeenCalledWith('status-task', 'in_progress');
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

    it('accepts all valid status values', async () => {
      const validStatuses: TaskStatus[] = [
        'backlog',
        'queue',
        'in_progress',
        'ai_review',
        'human_review',
        'done',
        'pr_created',
        'error',
      ];

      const task = createMockTask({ id: 'multi-status' });
      taskStore.tasks.set(task.id, task);

      for (const status of validStatuses) {
        const result = await invoke('tasks.updateStatus', {
          taskId: 'multi-status',
          status,
        });

        expect(result.success).toBe(true);
        expect((result.data as Task).status).toBe(status);
      }
    });
  });

  // ─── tasks.delete ────────────────────────────────────────────

  describe('tasks.delete', () => {
    it('deletes task', async () => {
      const task = createMockTask({ id: 'delete-me' });
      taskStore.tasks.set(task.id, task);
      taskStore.projectTasks.set('project-1', new Set(['delete-me']));

      const result = await invoke('tasks.delete', {
        taskId: 'delete-me',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(taskService.deleteTask).toHaveBeenCalledWith('project-1', 'delete-me');
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

    it('succeeds even for non-existent task', async () => {
      const result = await invoke('tasks.delete', {
        taskId: 'non-existent',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
    });
  });

  // ─── tasks.get ───────────────────────────────────────────────

  describe('tasks.get', () => {
    it('returns task by ID', async () => {
      const task = createMockTask({ id: 'get-me', title: 'Get This Task' });
      taskStore.tasks.set(task.id, task);
      taskStore.projectTasks.set('project-1', new Set(['get-me']));

      const result = await invoke('tasks.get', {
        projectId: 'project-1',
        taskId: 'get-me',
      });

      expect(result.success).toBe(true);
      expect((result.data as Task).id).toBe('get-me');
      expect((result.data as Task).title).toBe('Get This Task');
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

    it('handles service error for non-existent task', async () => {
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
      const task1 = createMockTask({ id: 'task-1', title: 'Task One' });
      const task2 = createMockTask({ id: 'task-2', title: 'Task Two' });
      taskStore.tasks.set(task1.id, task1);
      taskStore.tasks.set(task2.id, task2);
      taskStore.projectTasks.set('project-1', new Set(['task-1']));
      taskStore.projectTasks.set('project-2', new Set(['task-2']));

      const result = await invoke('tasks.listAll', {});

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('returns empty array when no tasks exist', async () => {
      const result = await invoke('tasks.listAll', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ─── tasks.execute ───────────────────────────────────────────

  describe('tasks.execute', () => {
    it('starts agent for task', async () => {
      const task = createMockTask({ id: 'exec-task', status: 'queue' });
      taskStore.tasks.set(task.id, task);
      taskStore.projectTasks.set('project-1', new Set(['exec-task']));

      const result = await invoke('tasks.execute', {
        taskId: 'exec-task',
        projectId: 'project-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('agentId');
      expect(agentService.startAgent).toHaveBeenCalledWith(
        'exec-task',
        'project-1',
        '/mock/projects/project-1',
      );
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
});
