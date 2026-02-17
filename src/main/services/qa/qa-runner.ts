/**
 * QA Runner — Orchestrates two-tier QA sessions
 *
 * Quiet mode: build -> launch -> agent -> collect -> report (background)
 * Full mode: same flow but with foreground app and longer timeout
 *
 * Uses the AgentOrchestrator to spawn headless Claude QA agents.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { waitForAgentCompletion } from './qa-agent-poller';
import { buildQaPrompt } from './qa-prompt';
import { createFallbackReport } from './qa-report-parser';
import { createQaSessionStore } from './qa-session-store';

import type {
  QaContext,
  QaMode,
  QaReport,
  QaRunner,
  QaSession,
  QaSessionStatus,
} from './qa-types';
import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { NotificationManager } from '../notifications';

export function createQaRunner(
  orchestrator: AgentOrchestrator,
  qaBaseDir: string,
  notificationManager?: NotificationManager,
): QaRunner {
  const store = createQaSessionStore();

  function getQaDir(taskId: string): string {
    const dir = join(qaBaseDir, 'qa', taskId);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  function notifyFailure(taskId: string, report: QaReport): void {
    if (notificationManager && report.result === 'fail') {
      notificationManager.onNotification({
        id: `qa-fail-${taskId}-${String(Date.now())}`,
        source: 'github',
        type: 'ci_status',
        title: `QA Failed: Task ${taskId}`,
        body: `${String(report.issues.length)} issue(s) found`,
        url: '',
        timestamp: new Date().toISOString(),
        read: false,
        metadata: { ciStatus: 'failure' },
      });
    }
  }

  async function runQaSession(
    taskId: string,
    mode: QaMode,
    context: QaContext,
  ): Promise<QaSession> {
    const qaDir = getQaDir(taskId);
    const session = store.createSession(taskId, mode);

    try {
      store.updateSession(session.id, { status: 'building' as QaSessionStatus });
      store.emitProgress(session.id, session, 'Building project', 1, 3);

      store.updateSession(session.id, { status: 'testing' as QaSessionStatus });
      store.emitProgress(session.id, session, 'Running QA agent', 2, 3);

      const prompt = buildQaPrompt(mode, context);
      const agentSession = await orchestrator.spawn({
        taskId: `qa-${taskId}`,
        projectPath: context.projectPath,
        prompt,
        phase: 'qa',
        env: { QA_MODE: mode, QA_OUTPUT_DIR: qaDir },
      });

      store.updateSession(session.id, { agentSessionId: agentSession.id });

      const report = await waitForAgentCompletion(orchestrator, agentSession.id, agentSession.logFile);

      store.reports.set(taskId, report);
      const completed = store.completeSession(session.id, session, report);

      notifyFailure(taskId, report);

      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const elapsed = Date.now() - Date.parse(session.startedAt);

      return store.failSession(session.id, session, createFallbackReport(elapsed, message));
    }
  }

  return {
    startQuiet(taskId: string, context: QaContext): Promise<QaSession> {
      const existing = store.findActiveSessionForTask(taskId);
      if (existing) {
        return Promise.resolve(existing);
      }
      return runQaSession(taskId, 'quiet', context);
    },

    startFull(taskId: string, context: QaContext): Promise<QaSession> {
      const existing = store.findActiveSessionForTask(taskId);
      if (existing) {
        return Promise.resolve(existing);
      }
      return runQaSession(taskId, 'full', context);
    },

    getSession(sessionId: string): QaSession | undefined {
      return store.sessions.get(sessionId);
    },

    getSessionByTaskId(taskId: string): QaSession | undefined {
      for (const session of store.sessions.values()) {
        if (session.taskId === taskId) {
          return session;
        }
      }
      return undefined;
    },

    getReportForTask(taskId: string): QaReport | undefined {
      return store.reports.get(taskId);
    },

    cancel(sessionId: string): void {
      const session = store.sessions.get(sessionId);
      if (!session) {
        return;
      }

      if (session.agentSessionId) {
        orchestrator.kill(session.agentSessionId);
      }

      store.updateSession(sessionId, {
        status: 'error' as QaSessionStatus,
        completedAt: new Date().toISOString(),
      });
    },

    onSessionEvent(handler): void {
      store.eventHandlers.push(handler);
    },

    dispose(): void {
      for (const session of store.sessions.values()) {
        if (store.isSessionActive(session) && session.agentSessionId) {
          orchestrator.kill(session.agentSessionId);
        }
      }

      store.sessions.clear();
      store.reports.clear();
      store.eventHandlers.length = 0;
    },
  };
}
