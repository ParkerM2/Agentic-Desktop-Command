/**
 * QA Runner — Orchestrates two-tier QA sessions
 *
 * Quiet mode: build -> launch -> agent -> collect -> report (background)
 * Full mode: same flow but with foreground app and longer timeout
 *
 * Uses the AgentOrchestrator to spawn headless Claude QA agents.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createFallbackReport, parseQaReport } from './qa-report-parser';

import type {
  QaContext,
  QaMode,
  QaReport,
  QaRunner,
  QaSession,
  QaSessionEvent,
  QaSessionEventHandler,
  QaSessionStatus,
} from './qa-types';
import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { NotificationManager } from '../notifications';

const POLL_INTERVAL_MS = 2000;
const POLL_INITIAL_DELAY_MS = 3000;

export function createQaRunner(
  orchestrator: AgentOrchestrator,
  qaBaseDir: string,
  notificationManager?: NotificationManager,
): QaRunner {
  const sessions = new Map<string, QaSession>();
  const reports = new Map<string, QaReport>();
  const eventHandlers: QaSessionEventHandler[] = [];

  function emitEvent(event: QaSessionEvent): void {
    for (const handler of eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[QaRunner] Event handler error:', message);
      }
    }
  }

  function updateSession(sessionId: string, updates: Partial<QaSession>): void {
    const session = sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  function getQaDir(taskId: string): string {
    const dir = join(qaBaseDir, 'qa', taskId);
    mkdirSync(dir, { recursive: true });
    return dir;
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

  function buildQaPrompt(mode: QaMode, context: QaContext): string {
    const directive = mode === 'quiet'
      ? 'Run quiet QA for this task. Check console errors, take screenshots of affected pages, run the verification suite, and report findings.'
      : 'Run full QA for this task. Walk through every page, test interactions, check accessibility, monitor DevTools console, take annotated screenshots, and report findings.';

    const changedFilesList = context.changedFiles.length > 0
      ? `\n\nChanged files:\n${context.changedFiles.map((f) => `  - ${f}`).join('\n')}`
      : '';

    const planSection = context.planContent
      ? `\n\nImplementation plan:\n${context.planContent}`
      : '';

    const reportFormat = [
      '',
      'Run the verification suite: npm run lint && npm run typecheck && npm run test && npm run build && npm run check:docs',
      '',
      'Output your report as a JSON block with this structure:',
      '```json',
      '{',
      '  "result": "pass" | "fail" | "warnings",',
      '  "checksRun": <number>,',
      '  "checksPassed": <number>,',
      '  "issues": [{ "severity": "critical"|"major"|"minor"|"cosmetic", "category": "<string>", "description": "<string>", "location": "<string>" }],',
      '  "verificationSuite": { "lint": "pass"|"fail", "typecheck": "pass"|"fail", "test": "pass"|"fail", "build": "pass"|"fail", "docs": "pass"|"fail" },',
      '  "screenshots": [{ "label": "<string>", "path": "<string>", "timestamp": "<iso>", "annotated": <boolean> }]',
      '}',
      '```',
    ].join('\n');

    return `${directive}\n\nTask description: ${context.taskDescription}${changedFilesList}${planSection}${reportFormat}`;
  }

  function waitForAgentCompletion(agentSessionId: string, logFile: string): Promise<QaReport> {
    const startTime = Date.now();

    return new Promise<QaReport>((resolve) => {
      const checkCompletion = (): void => {
        const currentAgentSession = orchestrator.getSession(agentSessionId);
        const isFinished = !currentAgentSession ||
          currentAgentSession.status === 'completed' ||
          currentAgentSession.status === 'error' ||
          currentAgentSession.status === 'killed';

        if (!isFinished) {
          setTimeout(checkCompletion, POLL_INTERVAL_MS);
          return;
        }

        let agentOutput = '';
        try {
          agentOutput = readFileSync(logFile, 'utf-8');
        } catch {
          // Log file may not exist
        }

        const elapsed = Date.now() - startTime;
        const parsed = parseQaReport(agentOutput, elapsed);
        resolve(parsed ?? createFallbackReport(elapsed, 'Could not parse QA agent output'));
      };

      setTimeout(checkCompletion, POLL_INITIAL_DELAY_MS);
    });
  }

  async function runQaSession(
    taskId: string,
    mode: QaMode,
    context: QaContext,
  ): Promise<QaSession> {
    const sessionId = `qa-${taskId}-${String(Date.now())}`;
    const qaDir = getQaDir(taskId);

    const session: QaSession = {
      id: sessionId,
      taskId,
      mode,
      status: 'building',
      startedAt: new Date().toISOString(),
      screenshots: [],
    };

    sessions.set(sessionId, session);

    emitEvent({
      type: 'started',
      session: { ...session },
      timestamp: new Date().toISOString(),
    });

    try {
      // Phase 1: Building
      updateSession(sessionId, { status: 'building' as QaSessionStatus });
      emitEvent({
        type: 'progress',
        session: sessions.get(sessionId) ?? session,
        timestamp: new Date().toISOString(),
        step: 'Building project',
        total: 3,
        current: 1,
      });

      // Phase 2: Testing via agent
      updateSession(sessionId, { status: 'testing' as QaSessionStatus });
      emitEvent({
        type: 'progress',
        session: sessions.get(sessionId) ?? session,
        timestamp: new Date().toISOString(),
        step: 'Running QA agent',
        total: 3,
        current: 2,
      });

      const prompt = buildQaPrompt(mode, context);
      const agentSession = await orchestrator.spawn({
        taskId: `qa-${taskId}`,
        projectPath: context.projectPath,
        prompt,
        phase: 'qa',
        env: {
          QA_MODE: mode,
          QA_OUTPUT_DIR: qaDir,
        },
      });

      updateSession(sessionId, { agentSessionId: agentSession.id });

      const report = await waitForAgentCompletion(agentSession.id, agentSession.logFile);

      // Phase 3: Completed
      updateSession(sessionId, {
        status: 'completed' as QaSessionStatus,
        completedAt: new Date().toISOString(),
        report,
        screenshots: report.screenshots.map((s) => s.path),
      });

      reports.set(taskId, report);

      const completedSession = sessions.get(sessionId) ?? session;

      emitEvent({
        type: 'completed',
        session: completedSession,
        timestamp: new Date().toISOString(),
      });

      // Notify on QA failure
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

      return completedSession;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const elapsed = Date.now() - Date.parse(session.startedAt);

      updateSession(sessionId, {
        status: 'error' as QaSessionStatus,
        completedAt: new Date().toISOString(),
        report: createFallbackReport(elapsed, message),
      });

      const errorSession = sessions.get(sessionId) ?? session;

      emitEvent({
        type: 'error',
        session: errorSession,
        timestamp: new Date().toISOString(),
      });

      return errorSession;
    }
  }

  return {
    startQuiet(taskId: string, context: QaContext): Promise<QaSession> {
      const existing = findActiveSessionForTask(taskId);
      if (existing) {
        return Promise.resolve(existing);
      }
      return runQaSession(taskId, 'quiet', context);
    },

    startFull(taskId: string, context: QaContext): Promise<QaSession> {
      const existing = findActiveSessionForTask(taskId);
      if (existing) {
        return Promise.resolve(existing);
      }
      return runQaSession(taskId, 'full', context);
    },

    getSession(sessionId: string): QaSession | undefined {
      return sessions.get(sessionId);
    },

    getSessionByTaskId(taskId: string): QaSession | undefined {
      for (const session of sessions.values()) {
        if (session.taskId === taskId) {
          return session;
        }
      }
      return undefined;
    },

    getReportForTask(taskId: string): QaReport | undefined {
      return reports.get(taskId);
    },

    cancel(sessionId: string): void {
      const session = sessions.get(sessionId);
      if (!session) {
        return;
      }

      if (session.agentSessionId) {
        orchestrator.kill(session.agentSessionId);
      }

      updateSession(sessionId, {
        status: 'error' as QaSessionStatus,
        completedAt: new Date().toISOString(),
      });
    },

    onSessionEvent(handler: QaSessionEventHandler): void {
      eventHandlers.push(handler);
    },

    dispose(): void {
      for (const session of sessions.values()) {
        if (isSessionActive(session) && session.agentSessionId) {
          orchestrator.kill(session.agentSessionId);
        }
      }

      sessions.clear();
      reports.clear();
      eventHandlers.length = 0;
    },
  };
}
