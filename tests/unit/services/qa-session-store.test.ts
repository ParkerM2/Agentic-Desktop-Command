/**
 * Unit Tests for QA Session Store
 *
 * Tests session creation, updates, event emission, active session detection,
 * and session completion/failure lifecycle.
 */

import { describe, expect, it, vi } from 'vitest';

// Mock logger
vi.mock('@main/lib/logger', () => ({
  serviceLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  createScopedLogger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
  appLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { createQaSessionStore } = await import('@main/features/qa/qa-session-store');

import type { QaReport, QaSession, QaSessionEvent } from '@main/features/qa/qa-types';

// ── Helpers ─────────────────────────────────────────────────────

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

describe('QaSessionStore', () => {
  describe('createSession()', () => {
    it('creates a session with correct initial state', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');

      expect(session.id).toContain('qa-task-1-');
      expect(session.taskId).toBe('task-1');
      expect(session.mode).toBe('quiet');
      expect(session.status).toBe('building');
      expect(session.startedAt).toBeTruthy();
      expect(session.screenshots).toEqual([]);
    });

    it('stores the session in the sessions map', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'full');

      expect(store.sessions.get(session.id)).toBe(session);
    });

    it('emits a started event on creation', () => {
      const store = createQaSessionStore();
      const events: QaSessionEvent[] = [];
      store.eventHandlers.push((e) => events.push(e));

      store.createSession('task-1', 'quiet');

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('started');
      expect(events[0]?.session.taskId).toBe('task-1');
    });
  });

  describe('updateSession()', () => {
    it('updates session properties', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');

      store.updateSession(session.id, { status: 'testing' });

      const updated = store.sessions.get(session.id);
      expect(updated?.status).toBe('testing');
    });

    it('does nothing for non-existent session', () => {
      const store = createQaSessionStore();
      // Should not throw
      store.updateSession('nonexistent', { status: 'completed' });
    });
  });

  describe('isSessionActive()', () => {
    it('returns true for building status', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');
      expect(store.isSessionActive(session)).toBe(true);
    });

    it('returns true for launching status', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');
      store.updateSession(session.id, { status: 'launching' });
      expect(store.isSessionActive(store.sessions.get(session.id) as QaSession)).toBe(true);
    });

    it('returns true for testing status', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');
      store.updateSession(session.id, { status: 'testing' });
      expect(store.isSessionActive(store.sessions.get(session.id) as QaSession)).toBe(true);
    });

    it('returns false for completed status', () => {
      const store = createQaSessionStore();
      const session: QaSession = {
        id: 'test', taskId: 'task-1', mode: 'quiet', status: 'completed',
        startedAt: new Date().toISOString(), screenshots: [],
      };
      expect(store.isSessionActive(session)).toBe(false);
    });

    it('returns false for error status', () => {
      const store = createQaSessionStore();
      const session: QaSession = {
        id: 'test', taskId: 'task-1', mode: 'quiet', status: 'error',
        startedAt: new Date().toISOString(), screenshots: [],
      };
      expect(store.isSessionActive(session)).toBe(false);
    });
  });

  describe('findActiveSessionForTask()', () => {
    it('returns active session for a task', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');

      const found = store.findActiveSessionForTask('task-1');
      expect(found?.id).toBe(session.id);
    });

    it('returns undefined for task with no active session', () => {
      const store = createQaSessionStore();
      expect(store.findActiveSessionForTask('nonexistent')).toBeUndefined();
    });

    it('returns undefined if session is completed', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');
      store.updateSession(session.id, { status: 'completed' });

      expect(store.findActiveSessionForTask('task-1')).toBeUndefined();
    });
  });

  describe('emitEvent()', () => {
    it('calls all registered handlers', () => {
      const store = createQaSessionStore();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      store.eventHandlers.push(handler1, handler2);

      const event: QaSessionEvent = {
        type: 'started',
        session: store.createSession('task-1', 'quiet'),
        timestamp: new Date().toISOString(),
      };
      // createSession already emitted one event, clear and test directly
      handler1.mockClear();
      handler2.mockClear();

      store.emitEvent(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('catches errors thrown by handlers without crashing', () => {
      const store = createQaSessionStore();
      const badHandler = vi.fn(() => { throw new Error('Handler error'); });
      const goodHandler = vi.fn();
      store.eventHandlers.push(badHandler, goodHandler);

      const event: QaSessionEvent = {
        type: 'started',
        session: { id: 'test', taskId: 't', mode: 'quiet', status: 'building', startedAt: '', screenshots: [] },
        timestamp: new Date().toISOString(),
      };

      store.emitEvent(event);

      expect(badHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
    });
  });

  describe('emitProgress()', () => {
    it('emits progress event with step info', () => {
      const store = createQaSessionStore();
      const events: QaSessionEvent[] = [];
      store.eventHandlers.push((e) => events.push(e));

      const session = store.createSession('task-1', 'quiet');
      store.emitProgress(session.id, session, 'Building', 1, 3);

      const progress = events.find((e) => e.type === 'progress');
      expect(progress).toBeDefined();
      expect(progress?.step).toBe('Building');
      expect(progress?.current).toBe(1);
      expect(progress?.total).toBe(3);
    });

    it('uses fallback session when sessionId not found', () => {
      const store = createQaSessionStore();
      const events: QaSessionEvent[] = [];
      store.eventHandlers.push((e) => events.push(e));

      const fallback: QaSession = {
        id: 'fallback', taskId: 'task-1', mode: 'quiet',
        status: 'building', startedAt: '', screenshots: [],
      };

      store.emitProgress('nonexistent', fallback, 'Step', 1, 1);

      const progress = events.find((e) => e.type === 'progress');
      expect(progress?.session.id).toBe('fallback');
    });
  });

  describe('completeSession()', () => {
    it('marks session as completed with report', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');
      const report = makeReport();

      const completed = store.completeSession(session.id, session, report);

      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeTruthy();
      expect(completed.report).toBe(report);
    });

    it('emits completed event', () => {
      const store = createQaSessionStore();
      const events: QaSessionEvent[] = [];
      store.eventHandlers.push((e) => events.push(e));

      const session = store.createSession('task-1', 'quiet');
      store.completeSession(session.id, session, makeReport());

      const completedEvent = events.find((e) => e.type === 'completed');
      expect(completedEvent).toBeDefined();
    });

    it('maps screenshot paths from report', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');
      const report = makeReport({
        screenshots: [
          { label: 'ss1', path: '/path/to/ss1.png', timestamp: '', annotated: false },
          { label: 'ss2', path: '/path/to/ss2.png', timestamp: '', annotated: true },
        ],
      });

      store.completeSession(session.id, session, report);
      const updated = store.sessions.get(session.id);
      expect(updated?.screenshots).toEqual(['/path/to/ss1.png', '/path/to/ss2.png']);
    });
  });

  describe('failSession()', () => {
    it('marks session as error with report', () => {
      const store = createQaSessionStore();
      const session = store.createSession('task-1', 'quiet');
      const report = makeReport({ result: 'fail' });

      const failed = store.failSession(session.id, session, report);

      expect(failed.status).toBe('error');
      expect(failed.completedAt).toBeTruthy();
      expect(failed.report).toBe(report);
    });

    it('emits error event', () => {
      const store = createQaSessionStore();
      const events: QaSessionEvent[] = [];
      store.eventHandlers.push((e) => events.push(e));

      const session = store.createSession('task-1', 'quiet');
      store.failSession(session.id, session, makeReport({ result: 'fail' }));

      const errorEvent = events.find((e) => e.type === 'error');
      expect(errorEvent).toBeDefined();
    });
  });
});
