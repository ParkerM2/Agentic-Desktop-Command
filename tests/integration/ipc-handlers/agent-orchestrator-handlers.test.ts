/**
 * Integration tests for agent orchestrator IPC handlers
 *
 * Tests the full IPC flow: channel -> handler -> AgentOrchestrator/TaskRepository -> response
 * with Zod validation at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ipcInvokeContract, type InvokeChannel } from '@shared/ipc-contract';

import type { IpcRouter } from '@main/ipc/router';
import type {
  AgentOrchestrator,
  AgentSession,
} from '@main/services/agent-orchestrator/types';
import type { TaskRepository } from '@main/services/tasks/types';
import type { Task as HubTask } from '@shared/types/hub-protocol';

// ─── Mock Factory ──────────────────────────────────────────────

function createMockAgentSession(overrides: Partial<AgentSession> = {}): AgentSession {
  const now = new Date().toISOString();
  return {
    id: 'session-1',
    taskId: 'task-1',
    pid: 12345,
    status: 'active',
    phase: 'planning',
    spawnedAt: now,
    lastHeartbeat: now,
    progressFile: '/mock/progress.jsonl',
    logFile: '/mock/log.txt',
    hooksConfigPath: '/mock/hooks.json',
    originalSettingsContent: null,
    exitCode: null,
    projectPath: '/mock/project',
    command: '/plan-feature Test task',
    ...overrides,
  };
}

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

function createMockOrchestrator(): AgentOrchestrator {
  return {
    spawn: vi.fn(),
    kill: vi.fn(),
    getSession: vi.fn(),
    getSessionByTaskId: vi.fn(),
    listActiveSessions: vi.fn(),
    onSessionEvent: vi.fn(),
    dispose: vi.fn(),
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

describe('Agent Orchestrator IPC Handlers', () => {
  let orchestrator: AgentOrchestrator;
  let taskRepository: TaskRepository;
  let router: IpcRouter;
  let invoke: ReturnType<typeof createTestRouter>['invoke'];

  beforeEach(async () => {
    orchestrator = createMockOrchestrator();
    taskRepository = createMockTaskRepository();

    const testRouter = createTestRouter();
    ({ router, invoke } = testRouter);

    const { registerAgentOrchestratorHandlers } = await import(
      '@main/ipc/handlers/agent-orchestrator-handlers'
    );
    registerAgentOrchestratorHandlers(router, orchestrator, taskRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── agent.startPlanning ──────────────────────────────────────

  describe('agent.startPlanning', () => {
    it('spawns a planning agent and returns session info', async () => {
      const session = createMockAgentSession({ id: 'plan-session-1' });
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask({ status: 'planning' }));
      vi.mocked(orchestrator.spawn).mockResolvedValue(session);

      const result = await invoke('agent.startPlanning', {
        taskId: 'task-1',
        projectPath: '/project',
        taskDescription: 'Build feature X',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sessionId: 'plan-session-1', status: 'spawned' });
      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith('task-1', 'planning');
      expect(orchestrator.spawn).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          projectPath: '/project',
          prompt: '/plan-feature Build feature X',
          phase: 'planning',
        }),
      );
    });

    it('passes optional subProjectPath to orchestrator', async () => {
      const session = createMockAgentSession();
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask());
      vi.mocked(orchestrator.spawn).mockResolvedValue(session);

      await invoke('agent.startPlanning', {
        taskId: 'task-1',
        projectPath: '/project',
        taskDescription: 'Build feature X',
        subProjectPath: '/project/packages/core',
      });

      expect(orchestrator.spawn).toHaveBeenCalledWith(
        expect.objectContaining({
          subProjectPath: '/project/packages/core',
        }),
      );
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('agent.startPlanning', {
        projectPath: '/project',
        taskDescription: 'Build feature X',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });

    it('validates input with Zod - missing projectPath', async () => {
      const result = await invoke('agent.startPlanning', {
        taskId: 'task-1',
        taskDescription: 'Build feature X',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectPath');
    });

    it('validates input with Zod - missing taskDescription', async () => {
      const result = await invoke('agent.startPlanning', {
        taskId: 'task-1',
        projectPath: '/project',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskDescription');
    });

    it('propagates orchestrator spawn error', async () => {
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask());
      vi.mocked(orchestrator.spawn).mockRejectedValue(new Error('Spawn failed'));

      const result = await invoke('agent.startPlanning', {
        taskId: 'task-1',
        projectPath: '/project',
        taskDescription: 'Build feature X',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Spawn failed');
    });
  });

  // ─── agent.startExecution ─────────────────────────────────────

  describe('agent.startExecution', () => {
    it('spawns an execution agent and returns session info', async () => {
      const session = createMockAgentSession({ id: 'exec-session-1', phase: 'executing' });
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask({ status: 'running' }));
      vi.mocked(orchestrator.spawn).mockResolvedValue(session);

      const result = await invoke('agent.startExecution', {
        taskId: 'task-1',
        projectPath: '/project',
        taskDescription: 'Build feature X',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sessionId: 'exec-session-1', status: 'spawned' });
      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith('task-1', 'running');
      expect(orchestrator.spawn).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          projectPath: '/project',
          prompt: '/implement-feature Build feature X',
          phase: 'executing',
        }),
      );
    });

    it('includes planRef in prompt when provided', async () => {
      const session = createMockAgentSession({ phase: 'executing' });
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask());
      vi.mocked(orchestrator.spawn).mockResolvedValue(session);

      await invoke('agent.startExecution', {
        taskId: 'task-1',
        projectPath: '/project',
        taskDescription: 'Build feature X',
        planRef: 'docs/plans/feature-x.md',
      });

      expect(orchestrator.spawn).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: '/implement-feature Build feature X --plan docs/plans/feature-x.md',
        }),
      );
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('agent.startExecution', {
        projectPath: '/project',
        taskDescription: 'Build feature X',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });

    it('validates input with Zod - missing projectPath', async () => {
      const result = await invoke('agent.startExecution', {
        taskId: 'task-1',
        taskDescription: 'Build feature X',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectPath');
    });
  });

  // ─── agent.replanWithFeedback ─────────────────────────────────

  describe('agent.replanWithFeedback', () => {
    it('spawns a replanning agent with feedback', async () => {
      const session = createMockAgentSession({ id: 'replan-session-1' });
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask({ status: 'planning' }));
      vi.mocked(orchestrator.spawn).mockResolvedValue(session);

      const result = await invoke('agent.replanWithFeedback', {
        taskId: 'task-1',
        projectPath: '/project',
        taskDescription: 'Build feature X',
        feedback: 'Need better error handling',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sessionId: 'replan-session-1', status: 'spawned' });
      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith('task-1', 'planning');
      expect(orchestrator.spawn).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          phase: 'planning',
        }),
      );
    });

    it('includes previousPlanPath in prompt when provided', async () => {
      const session = createMockAgentSession();
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask());
      vi.mocked(orchestrator.spawn).mockResolvedValue(session);

      await invoke('agent.replanWithFeedback', {
        taskId: 'task-1',
        projectPath: '/project',
        taskDescription: 'Build feature X',
        feedback: 'Need better error handling',
        previousPlanPath: '/plans/old-plan.md',
      });

      const spawnCall = vi.mocked(orchestrator.spawn).mock.calls[0][0];
      expect(spawnCall.prompt).toContain('Need better error handling');
      expect(spawnCall.prompt).toContain('/plans/old-plan.md');
    });

    it('validates input with Zod - missing feedback', async () => {
      const result = await invoke('agent.replanWithFeedback', {
        taskId: 'task-1',
        projectPath: '/project',
        taskDescription: 'Build feature X',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('feedback');
    });

    it('validates input with Zod - missing taskDescription', async () => {
      const result = await invoke('agent.replanWithFeedback', {
        taskId: 'task-1',
        projectPath: '/project',
        feedback: 'Need better error handling',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskDescription');
    });
  });

  // ─── agent.killSession ────────────────────────────────────────

  describe('agent.killSession', () => {
    it('kills session and returns success', async () => {
      const result = await invoke('agent.killSession', { sessionId: 'session-1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(orchestrator.kill).toHaveBeenCalledWith('session-1');
    });

    it('validates input with Zod - missing sessionId', async () => {
      const result = await invoke('agent.killSession', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('sessionId');
    });
  });

  // ─── agent.restartFromCheckpoint ──────────────────────────────

  describe('agent.restartFromCheckpoint', () => {
    it('restarts agent for task with no existing session', async () => {
      const newSession = createMockAgentSession({ id: 'restart-session-1' });
      vi.mocked(orchestrator.getSessionByTaskId).mockReturnValue(undefined);
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask());
      vi.mocked(orchestrator.spawn).mockResolvedValue(newSession);

      const result = await invoke('agent.restartFromCheckpoint', {
        taskId: 'task-1',
        projectPath: '/project',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sessionId: 'restart-session-1', status: 'spawned' });
      expect(orchestrator.kill).not.toHaveBeenCalled();
    });

    it('kills existing session before restarting', async () => {
      const existingSession = createMockAgentSession({
        id: 'existing-session',
        phase: 'executing',
        command: 'Build the thing',
      });
      const newSession = createMockAgentSession({ id: 'new-session' });

      vi.mocked(orchestrator.getSessionByTaskId).mockReturnValue(existingSession);
      vi.mocked(taskRepository.updateTaskStatus).mockResolvedValue(createMockHubTask());
      vi.mocked(orchestrator.spawn).mockResolvedValue(newSession);

      const result = await invoke('agent.restartFromCheckpoint', {
        taskId: 'task-1',
        projectPath: '/project',
      });

      expect(result.success).toBe(true);
      expect(orchestrator.kill).toHaveBeenCalledWith('existing-session');
      expect(taskRepository.updateTaskStatus).toHaveBeenCalledWith('task-1', 'running');
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('agent.restartFromCheckpoint', {
        projectPath: '/project',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });

    it('validates input with Zod - missing projectPath', async () => {
      const result = await invoke('agent.restartFromCheckpoint', {
        taskId: 'task-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('projectPath');
    });
  });

  // ─── agent.getOrchestratorSession ─────────────────────────────

  describe('agent.getOrchestratorSession', () => {
    it('returns session for task', async () => {
      const session = createMockAgentSession({ id: 'found-session', taskId: 'task-1' });
      vi.mocked(orchestrator.getSessionByTaskId).mockReturnValue(session);

      const result = await invoke('agent.getOrchestratorSession', { taskId: 'task-1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(session);
      expect(orchestrator.getSessionByTaskId).toHaveBeenCalledWith('task-1');
    });

    it('returns null when no session exists for task', async () => {
      vi.mocked(orchestrator.getSessionByTaskId).mockReturnValue(undefined);

      const result = await invoke('agent.getOrchestratorSession', { taskId: 'no-task' });

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('validates input with Zod - missing taskId', async () => {
      const result = await invoke('agent.getOrchestratorSession', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('taskId');
    });
  });

  // ─── agent.listOrchestratorSessions ───────────────────────────

  describe('agent.listOrchestratorSessions', () => {
    it('returns all active sessions', async () => {
      const sessions = [
        createMockAgentSession({ id: 'session-1', taskId: 'task-1' }),
        createMockAgentSession({ id: 'session-2', taskId: 'task-2' }),
      ];
      vi.mocked(orchestrator.listActiveSessions).mockReturnValue(sessions);

      const result = await invoke('agent.listOrchestratorSessions', {});

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('returns empty array when no active sessions', async () => {
      vi.mocked(orchestrator.listActiveSessions).mockReturnValue([]);

      const result = await invoke('agent.listOrchestratorSessions', {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});
