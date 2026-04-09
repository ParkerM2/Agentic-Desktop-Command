/**
 * Unit Tests for InsightsService
 *
 * Tests getMetrics, getTimeSeries, getTaskDistribution, getProjectBreakdown.
 * Mocks all service dependencies.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createInsightsService } from '@main/features/insights/insights-service';

// ── Mock Factories ────────────────────────────────────────────

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Test Task',
    status: 'todo',
    updatedAt: '2026-04-05T12:00:00Z',
    ...overrides,
  };
}

function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'proj-1',
    name: 'Test Project',
    path: '/projects/test',
    ...overrides,
  };
}

function makeAgentSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    taskId: 'task-1',
    status: 'active',
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMockDeps(options: {
  tasks?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  sessions?: Array<Record<string, unknown>>;
  qaReports?: Record<string, { result: string }>;
} = {}) {
  const tasks = options.tasks ?? [];
  const projects = options.projects ?? [makeProject()];
  const sessions = options.sessions ?? [];
  const qaReports = options.qaReports ?? {};

  return {
    taskService: {
      listTasks: vi.fn((_projectId: string) => tasks),
      listAllTasks: vi.fn(() => tasks),
      getTask: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      updateTaskStatus: vi.fn(),
      deleteTask: vi.fn(),
    },
    projectService: {
      listProjects: vi.fn().mockResolvedValue(projects),
      listProjectsSync: vi.fn(() => projects),
      addProject: vi.fn(),
      removeProject: vi.fn(),
      updateProject: vi.fn(),
      selectDirectory: vi.fn(),
      getSubProjects: vi.fn(),
      createSubProject: vi.fn(),
      removeSubProject: vi.fn(),
      getProjectPath: vi.fn(),
    },
    busSessionManager: {
      spawn: vi.fn(),
      kill: vi.fn(),
      get: vi.fn(),
      list: vi.fn(() => sessions),
      onEvent: vi.fn(),
      recoverInterrupted: vi.fn(),
      dispose: vi.fn(),
    },
    qaRunner: {
      startQuiet: vi.fn(),
      startFull: vi.fn(),
      getSession: vi.fn(),
      getSessionByTaskId: vi.fn(),
      getReportForTask: vi.fn((taskId: string) => qaReports[taskId] ?? undefined),
      listSessions: vi.fn(() => []),
      cancel: vi.fn(),
      onSessionEvent: vi.fn(),
      dispose: vi.fn(),
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('InsightsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMetrics()', () => {
    it('returns zero metrics when no tasks exist', () => {
      const deps = makeMockDeps();
      const service = createInsightsService(deps as never);

      const metrics = service.getMetrics();

      expect(metrics.totalTasks).toBe(0);
      expect(metrics.completedTasks).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.totalTokenCost).toBe(0);
    });

    it('calculates completion rate correctly', () => {
      const deps = makeMockDeps({
        tasks: [
          makeTask({ id: 't1', status: 'done' }),
          makeTask({ id: 't2', status: 'done' }),
          makeTask({ id: 't3', status: 'todo' }),
          makeTask({ id: 't4', status: 'in-progress' }),
        ],
      });
      const service = createInsightsService(deps as never);

      const metrics = service.getMetrics();

      expect(metrics.totalTasks).toBe(4);
      expect(metrics.completedTasks).toBe(2);
      expect(metrics.completionRate).toBe(50);
    });

    it('filters by projectId when provided', () => {
      const deps = makeMockDeps({
        tasks: [
          makeTask({ id: 't1', status: 'done' }),
        ],
      });
      const service = createInsightsService(deps as never);

      service.getMetrics('proj-1');

      // Should only call listTasks with the specific project
      expect(deps.taskService.listTasks).toHaveBeenCalledWith('proj-1');
    });

    it('includes agent metrics from orchestrator', () => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      const deps = makeMockDeps({
        sessions: [
          makeAgentSession({ status: 'active', startedAt: `${today}T10:00:00Z` }),
          makeAgentSession({ status: 'completed', startedAt: `${today}T09:00:00Z` }),
          makeAgentSession({ status: 'error', startedAt: `${today}T08:00:00Z` }),
        ],
      });
      const service = createInsightsService(deps as never);

      const metrics = service.getMetrics();

      expect(metrics.activeAgents).toBe(1); // 1 active
      expect(metrics.agentRunCount).toBe(3); // all 3 spawned today
      expect(metrics.agentSuccessRate).toBe(50); // 1/2 finished as completed
    });

    it('includes QA pass rate when qaRunner is present', () => {
      const deps = makeMockDeps({
        tasks: [
          makeTask({ id: 't1', status: 'done' }),
          makeTask({ id: 't2', status: 'done' }),
        ],
        qaReports: {
          't1': { result: 'pass' },
          't2': { result: 'fail' },
        },
      });
      const service = createInsightsService(deps as never);

      const metrics = service.getMetrics();

      expect(metrics.qaPassRate).toBe(50);
    });
  });

  describe('getTimeSeries()', () => {
    it('returns entries for specified number of days', () => {
      const deps = makeMockDeps();
      const service = createInsightsService(deps as never);

      const series = service.getTimeSeries(undefined, 3);

      expect(series).toHaveLength(3);
      for (const entry of series) {
        expect(entry.date).toBeTruthy();
        expect(typeof entry.tasksCompleted).toBe('number');
        expect(typeof entry.agentRuns).toBe('number');
      }
    });

    it('defaults to 7 days', () => {
      const deps = makeMockDeps();
      const service = createInsightsService(deps as never);

      const series = service.getTimeSeries();

      expect(series).toHaveLength(7);
    });

    it('counts tasks completed on each day', () => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      const deps = makeMockDeps({
        tasks: [
          makeTask({ id: 't1', status: 'done', updatedAt: `${today}T12:00:00Z` }),
          makeTask({ id: 't2', status: 'done', updatedAt: `${today}T14:00:00Z` }),
          makeTask({ id: 't3', status: 'todo', updatedAt: `${today}T10:00:00Z` }),
        ],
      });
      const service = createInsightsService(deps as never);

      const series = service.getTimeSeries(undefined, 1);

      expect(series[0]?.tasksCompleted).toBe(2);
    });
  });

  describe('getTaskDistribution()', () => {
    it('returns status distribution counts', () => {
      const deps = makeMockDeps({
        tasks: [
          makeTask({ status: 'todo' }),
          makeTask({ status: 'todo' }),
          makeTask({ status: 'done' }),
          makeTask({ status: 'in-progress' }),
        ],
      });
      const service = createInsightsService(deps as never);

      const dist = service.getTaskDistribution();

      expect(dist).toHaveLength(3);

      const todoEntry = dist.find((d) => d.status === 'todo');
      expect(todoEntry?.count).toBe(2);
      expect(todoEntry?.percentage).toBe(50);

      const doneEntry = dist.find((d) => d.status === 'done');
      expect(doneEntry?.count).toBe(1);
      expect(doneEntry?.percentage).toBe(25);
    });

    it('returns empty array when no tasks', () => {
      const deps = makeMockDeps({ tasks: [] });
      const service = createInsightsService(deps as never);

      const dist = service.getTaskDistribution();

      expect(dist).toEqual([]);
    });
  });

  describe('getProjectBreakdown()', () => {
    it('returns per-project metrics', () => {
      const deps = makeMockDeps({
        projects: [
          makeProject({ id: 'p1', name: 'Project A' }),
          makeProject({ id: 'p2', name: 'Project B' }),
        ],
        tasks: [
          makeTask({ status: 'done' }),
          makeTask({ status: 'todo' }),
        ],
      });
      const service = createInsightsService(deps as never);

      const breakdown = service.getProjectBreakdown();

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0]?.projectName).toBe('Project A');
      expect(breakdown[1]?.projectName).toBe('Project B');
    });

    it('calculates completionRate per project', () => {
      const deps = makeMockDeps({
        projects: [makeProject({ id: 'p1', name: 'Solo' })],
        tasks: [
          makeTask({ status: 'done' }),
          makeTask({ status: 'done' }),
          makeTask({ status: 'todo' }),
        ],
      });
      const service = createInsightsService(deps as never);

      const breakdown = service.getProjectBreakdown();

      // 2 out of 3 tasks done for the single project
      expect(breakdown[0]?.completionRate).toBe(67);
    });

    it('returns 0% completion for project with no tasks', () => {
      const deps = makeMockDeps({
        projects: [makeProject()],
        tasks: [],
      });
      const service = createInsightsService(deps as never);

      const breakdown = service.getProjectBreakdown();

      expect(breakdown[0]?.completionRate).toBe(0);
      expect(breakdown[0]?.taskCount).toBe(0);
    });
  });
});
