/**
 * Unit Tests for QA Runner
 *
 * Tests QA session orchestration: start quiet/full, cancel, get session/report,
 * list sessions, event handlers, and dispose.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { QaContext, QaReport, QaSession } from '@main/services/qa/qa-types';

// Mock logger
vi.mock('@main/lib/logger', () => ({
  serviceLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  createScopedLogger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
  appLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Mock fs (for mkdirSync in getQaDir)
vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
}));

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return { ...original, join: original.posix.join };
});

// Mock qa-prompt
vi.mock('@main/services/qa/qa-prompt', () => ({
  buildQaPrompt: vi.fn(() => 'test prompt'),
}));

// Mock qa-agent-poller
const mockWaitForAgentCompletion = vi.fn<() => Promise<QaReport>>();
vi.mock('@main/services/qa/qa-agent-poller', () => ({
  waitForAgentCompletion: (...args: unknown[]) => mockWaitForAgentCompletion(...(args as [])),
}));

// Mock qa-report-parser (fallback)
vi.mock('@main/services/qa/qa-report-parser', async () => {
  const actual = await import('@main/services/qa/qa-report-parser');
  return actual;
});

const { createQaRunner } = await import('@main/services/qa/qa-runner');

// ── Helpers ─────────────────────────────────────────────────────

function makeOrchestrator() {
  return {
    spawn: vi.fn(() => Promise.resolve({ id: 'agent-session-1', logFile: '/logs/qa.log' })),
    kill: vi.fn(),
    getSession: vi.fn(() => undefined),
    listSessions: vi.fn(() => []),
  };
}

function makeContext(overrides: Partial<QaContext> = {}): QaContext {
  return {
    projectPath: '/mock/project',
    changedFiles: ['src/index.ts'],
    taskDescription: 'Test task',
    ...overrides,
  };
}

function makeReport(overrides: Partial<QaReport> = {}): QaReport {
  return {
    result: 'pass',
    checksRun: 5,
    checksPassed: 5,
    issues: [],
    verificationSuite: { lint: 'pass', typecheck: 'pass', test: 'pass', build: 'pass', docs: 'pass' },
    screenshots: [],
    duration: 1000,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('QaRunner', () => {
  let orchestrator: ReturnType<typeof makeOrchestrator>;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = makeOrchestrator();
    mockWaitForAgentCompletion.mockResolvedValue(makeReport());
  });

  describe('startQuiet()', () => {
    it('creates a session and runs QA', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      const session = await runner.startQuiet('task-1', makeContext());

      expect(session).toBeDefined();
      expect(session.taskId).toBe('task-1');
      expect(session.mode).toBe('quiet');
      expect(session.status).toBe('completed');
    });

    it('returns existing active session for same task', async () => {
      // Make the poller hang to keep session active
      mockWaitForAgentCompletion.mockImplementation(
        () => new Promise(() => { /* never resolves */ }),
      );

      const runner = createQaRunner(orchestrator as never, '/mock/qa');

      // Start first session but don't await — it will be active
      const promise1 = runner.startQuiet('task-1', makeContext());

      // Wait a tick for session to be created
      await new Promise((r) => { setTimeout(r, 10); });

      // Second call should return the active session, not start a new one
      const session2 = await runner.startQuiet('task-1', makeContext());
      expect(session2.taskId).toBe('task-1');
      expect(session2.status).toBe('testing'); // Still active

      // Cleanup: let promise resolve
      mockWaitForAgentCompletion.mockResolvedValue(makeReport());
      await Promise.race([promise1, new Promise((r) => { setTimeout(r, 50); })]);
    });

    it('stores report for task after completion', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      await runner.startQuiet('task-1', makeContext());

      const report = runner.getReportForTask('task-1');
      expect(report).toBeDefined();
      expect(report?.result).toBe('pass');
    });
  });

  describe('startFull()', () => {
    it('creates a full mode session', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      const session = await runner.startFull('task-1', makeContext());

      expect(session.mode).toBe('full');
      expect(session.status).toBe('completed');
    });
  });

  describe('error handling', () => {
    it('returns error session when orchestrator spawn fails', async () => {
      orchestrator.spawn.mockRejectedValueOnce(new Error('Spawn failed'));

      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      const session = await runner.startQuiet('task-1', makeContext());

      expect(session.status).toBe('error');
      expect(session.report?.result).toBe('fail');
    });

    it('returns error session when poller fails', async () => {
      mockWaitForAgentCompletion.mockRejectedValueOnce(new Error('Polling error'));

      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      const session = await runner.startQuiet('task-1', makeContext());

      expect(session.status).toBe('error');
    });
  });

  describe('getSession()', () => {
    it('returns session by ID', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      const created = await runner.startQuiet('task-1', makeContext());

      const found = runner.getSession(created.id);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined for non-existent session', () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      expect(runner.getSession('nonexistent')).toBeUndefined();
    });
  });

  describe('getSessionByTaskId()', () => {
    it('returns session by task ID', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      await runner.startQuiet('task-1', makeContext());

      const found = runner.getSessionByTaskId('task-1');
      expect(found?.taskId).toBe('task-1');
    });

    it('returns undefined for unknown task', () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      expect(runner.getSessionByTaskId('unknown')).toBeUndefined();
    });
  });

  describe('listSessions()', () => {
    it('returns all sessions', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      await runner.startQuiet('task-1', makeContext());
      await runner.startQuiet('task-2', makeContext());

      const list = runner.listSessions();
      expect(list).toHaveLength(2);
    });
  });

  describe('cancel()', () => {
    it('kills the agent session and marks error', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      const session = await runner.startQuiet('task-1', makeContext());

      runner.cancel(session.id);

      const updated = runner.getSession(session.id);
      expect(updated?.status).toBe('error');
    });

    it('does nothing for non-existent session', () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      // Should not throw
      runner.cancel('nonexistent');
    });
  });

  describe('onSessionEvent()', () => {
    it('registers an event handler that receives events', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      const events: Array<{ type: string }> = [];
      runner.onSessionEvent((e) => events.push(e));

      await runner.startQuiet('task-1', makeContext());

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'started')).toBe(true);
      expect(events.some((e) => e.type === 'completed')).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('kills active agent sessions and clears state', async () => {
      const runner = createQaRunner(orchestrator as never, '/mock/qa');
      await runner.startQuiet('task-1', makeContext());

      runner.dispose();

      expect(runner.listSessions()).toHaveLength(0);
    });
  });

  describe('notification on failure', () => {
    it('sends notification when QA fails and notificationManager is provided', async () => {
      mockWaitForAgentCompletion.mockResolvedValueOnce(makeReport({
        result: 'fail',
        issues: [{ severity: 'critical', category: 'test', description: 'Fail' }],
      }));

      const notificationManager = { onNotification: vi.fn() };
      const runner = createQaRunner(orchestrator as never, '/mock/qa', notificationManager as never);
      await runner.startQuiet('task-1', makeContext());

      expect(notificationManager.onNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('QA Failed'),
        }),
      );
    });

    it('does not send notification when QA passes', async () => {
      mockWaitForAgentCompletion.mockResolvedValueOnce(makeReport({ result: 'pass' }));

      const notificationManager = { onNotification: vi.fn() };
      const runner = createQaRunner(orchestrator as never, '/mock/qa', notificationManager as never);
      await runner.startQuiet('task-1', makeContext());

      expect(notificationManager.onNotification).not.toHaveBeenCalled();
    });
  });
});
