/**
 * QA Session Store
 *
 * Manages in-memory session and report storage, event emission, and session lifecycle.
 */

import { serviceLogger } from '@main/lib/logger';

import type {
  QaMode,
  QaReport,
  QaSession,
  QaSessionEvent,
  QaSessionEventHandler,
  QaSessionStatus,
} from './qa-types';

export interface QaSessionStore {
  sessions: Map<string, QaSession>;
  reports: Map<string, QaReport>;
  eventHandlers: QaSessionEventHandler[];
  emitEvent: (event: QaSessionEvent) => void;
  updateSession: (sessionId: string, updates: Partial<QaSession>) => void;
  isSessionActive: (session: QaSession) => boolean;
  findActiveSessionForTask: (taskId: string) => QaSession | undefined;
  createSession: (taskId: string, mode: QaMode) => QaSession;
  emitProgress: (sessionId: string, fallback: QaSession, step: string, current: number, total: number) => void;
  completeSession: (sessionId: string, fallback: QaSession, report: QaReport) => QaSession;
  failSession: (sessionId: string, fallback: QaSession, report: QaReport) => QaSession;
}

export function createQaSessionStore(): QaSessionStore {
  const sessions = new Map<string, QaSession>();
  const reports = new Map<string, QaReport>();
  const eventHandlers: QaSessionEventHandler[] = [];

  function emitEvent(event: QaSessionEvent): void {
    for (const handler of eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        serviceLogger.error('[QaRunner] Event handler error:', message);
      }
    }
  }

  function updateSession(sessionId: string, updates: Partial<QaSession>): void {
    const session = sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  function isSessionActive(session: QaSession): boolean {
    return (
      session.status === 'building' ||
      session.status === 'launching' ||
      session.status === 'testing'
    );
  }

  function findActiveSessionForTask(taskId: string): QaSession | undefined {
    for (const session of sessions.values()) {
      if (session.taskId === taskId && isSessionActive(session)) {
        return session;
      }
    }
    return undefined;
  }

  function createSession(taskId: string, mode: QaMode): QaSession {
    const sessionId = `qa-${taskId}-${String(Date.now())}`;
    const session: QaSession = {
      id: sessionId,
      taskId,
      mode,
      status: 'building',
      startedAt: new Date().toISOString(),
      screenshots: [],
    };
    sessions.set(sessionId, session);
    emitEvent({ type: 'started', session: { ...session }, timestamp: new Date().toISOString() });
    return session;
  }

  function emitProgress(sessionId: string, fallback: QaSession, step: string, current: number, total: number): void {
    emitEvent({
      type: 'progress',
      session: sessions.get(sessionId) ?? fallback,
      timestamp: new Date().toISOString(),
      step,
      total,
      current,
    });
  }

  function completeSession(sessionId: string, fallback: QaSession, report: QaReport): QaSession {
    updateSession(sessionId, {
      status: 'completed' as QaSessionStatus,
      completedAt: new Date().toISOString(),
      report,
      screenshots: report.screenshots.map((s) => s.path),
    });
    const completed = sessions.get(sessionId) ?? fallback;
    emitEvent({ type: 'completed', session: completed, timestamp: new Date().toISOString() });
    return completed;
  }

  function failSession(sessionId: string, fallback: QaSession, report: QaReport): QaSession {
    updateSession(sessionId, {
      status: 'error' as QaSessionStatus,
      completedAt: new Date().toISOString(),
      report,
    });
    const errored = sessions.get(sessionId) ?? fallback;
    emitEvent({ type: 'error', session: errored, timestamp: new Date().toISOString() });
    return errored;
  }

  return {
    sessions,
    reports,
    eventHandlers,
    emitEvent,
    updateSession,
    isSessionActive,
    findActiveSessionForTask,
    createSession,
    emitProgress,
    completeSession,
    failSession,
  };
}
