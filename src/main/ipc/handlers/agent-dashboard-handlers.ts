/**
 * Agent Dashboard IPC Handlers
 *
 * Thin handler layer connecting IPC contracts to agent dashboard services.
 * No business logic — just delegates to service methods and forwards events.
 *
 * Note: Agent manager events (session.started, message.received, etc.) are
 * emitted directly by the AgentManagerService via the router it receives
 * at construction. Only teammate events need forwarding here since the
 * TeamWatcher service does not have a router reference.
 */

import { AGENT_DASHBOARD, AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';
import type {
  QaDashboardIssue,
  QaDashboardSession,
  QaVerdict,
  QaVerificationStatus,
  QaVerificationSuite,
  TeamMember,
} from '@shared/types/agent-dashboard';

import type { AgentManagerService } from '../../services/agent-manager';
import type { GitService } from '../../services/git/git-service';
import type { QaRunner, QaSession } from '../../services/qa/qa-types';
import type { IpcRouter } from '../router';

// ── Service Interfaces ───────────────────────────────────────

export interface TeamWatcherService {
  onTeammateJoined: (listener: (member: TeamMember) => void) => void;
  onTeammateLeft: (listener: (memberId: string) => void) => void;
}

// ── QA Mapping Helper ────────────────────────────────────────

function mapQaResultToVerdict(session: QaSession): QaVerdict {
  if (
    session.status === 'building' ||
    session.status === 'launching' ||
    session.status === 'testing'
  ) {
    return 'running';
  }

  if (!session.report) {
    return 'none';
  }

  const { result } = session.report;
  return result;
}

function mapVerificationResult(result: 'pass' | 'fail' | undefined): QaVerificationStatus {
  if (result === 'pass') return 'pass';
  if (result === 'fail') return 'fail';
  return 'pending';
}

function mapQaSessionToDashboard(session: QaSession): QaDashboardSession {
  const { report } = session;

  const verificationSuite: QaVerificationSuite = report
    ? {
        lint: mapVerificationResult(report.verificationSuite.lint),
        typecheck: mapVerificationResult(report.verificationSuite.typecheck),
        test: mapVerificationResult(report.verificationSuite.test),
        build: mapVerificationResult(report.verificationSuite.build),
        docs: mapVerificationResult(report.verificationSuite.docs),
      }
    : {
        lint: 'pending',
        typecheck: 'pending',
        test: 'pending',
        build: 'pending',
        docs: 'pending',
      };

  const issues: QaDashboardIssue[] = report
    ? report.issues.map((issue) => ({
        severity: issue.severity,
        category: issue.category,
        description: issue.description,
        location: issue.location,
      }))
    : [];

  return {
    sessionId: session.id,
    taskId: session.taskId,
    verdict: mapQaResultToVerdict(session),
    checksRun: report?.checksRun ?? 0,
    checksPassed: report?.checksPassed ?? 0,
    issues,
    verificationSuite,
    duration: report?.duration ?? 0,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}

// ── Handler Registration ─────────────────────────────────────

export function registerAgentDashboardHandlers(
  router: IpcRouter,
  agentManager: AgentManagerService,
  teamWatcher: TeamWatcherService,
  qaRunner: QaRunner,
  gitService: GitService,
): void {
  // ── Invoke Handlers ──────────────────────────────────────

  router.handle(AGENT_DASHBOARD.SPAWN['PROJECT-OWNER'], (config) => {
    const session = agentManager.spawnProjectOwner(config);
    return Promise.resolve({ sessionId: session.id, status: 'spawned' as const });
  });

  router.handle(AGENT_DASHBOARD.SPAWN['TEAM-LEAD'], (config) => {
    const result = agentManager.spawnTeamLead(config);
    if ('error' in result) {
      throw new Error(`spawnTeamLead failed: ${result.error}`);
    }
    return Promise.resolve({
      sessionId: result.id,
      status: 'spawned' as const,
    });
  });

  router.handle(AGENT_DASHBOARD.LIST.SESSIONS, (filter) =>
    Promise.resolve(agentManager.listSessions(filter)),
  );

  router.handle(AGENT_DASHBOARD.GET.SESSION, ({ sessionId }) =>
    Promise.resolve(agentManager.getSession(sessionId) ?? null),
  );

  router.handle(AGENT_DASHBOARD.SEND.MESSAGE, ({ sessionId, message }) =>
    Promise.resolve({ success: agentManager.sendMessage(sessionId, message) }),
  );

  router.handle(AGENT_DASHBOARD.STOP.SESSION, ({ sessionId }) =>
    Promise.resolve({ success: agentManager.stopSession(sessionId) }),
  );

  router.handle(AGENT_DASHBOARD.GET['FILES-CHANGED'], (input) => {
    const projectPath = agentManager.getSessionProjectPath(input.sessionId);
    if (!projectPath) {
      return Promise.resolve([]);
    }
    return gitService.getFilesChanged(projectPath, input.branch);
  });

  // ── Workflow Task Handlers ──────────────────────────────────

  router.handle(AGENT_DASHBOARD.GET['TASKS-FOR-FEATURE'], (_input) => {
    // TODO: Re-implement with command bus backed progress tracking
    return Promise.resolve([]);
  });

  router.handle(AGENT_DASHBOARD.GET.TASK, (_input) =>
    Promise.resolve(null),
  );

  // ── QA Handlers ─────────────────────────────────────────────

  router.handle(AGENT_DASHBOARD.GET['QA-SESSION'], (input) => {
    const session = qaRunner.getSessionByTaskId(input.taskId);
    return Promise.resolve(session ? mapQaSessionToDashboard(session) : null);
  });

  router.handle(AGENT_DASHBOARD.LIST['QA-SESSIONS'], () =>
    Promise.resolve(qaRunner.listSessions().map(mapQaSessionToDashboard)),
  );

  // ── Per-Session Data Handlers ───────────────────────────────

  router.handle(AGENT_DASHBOARD.LIST['SESSIONS-FOR-TASK'], (_input) =>
    Promise.resolve([]),
  );

  router.handle(AGENT_DASHBOARD.GET['SESSION-LOG'], (_input) =>
    Promise.resolve([]),
  );

  router.handle(AGENT_DASHBOARD.GET['GIT-DIFF'], (_input) =>
    Promise.resolve({ diff: '' }),
  );

  // ── Event Forwarding ─────────────────────────────────────
  // Agent manager events are emitted directly by the service via router.
  // Only teammate join/leave events need forwarding from TeamWatcher.

  teamWatcher.onTeammateJoined((member) => {
    router.emit(AGENT_DASHBOARD_EVENTS.TEAMMATE.JOINED, member);
  });

  teamWatcher.onTeammateLeft((memberId) => {
    router.emit(AGENT_DASHBOARD_EVENTS.TEAMMATE.LEFT, { agentId: memberId, teamName: '' });
  });

  // Forward QA session events (progress + completed only)
  qaRunner.onSessionEvent((event) => {
    if (event.type === 'completed' || event.type === 'progress') {
      router.emit(
        AGENT_DASHBOARD_EVENTS.QA['SESSION-UPDATED'],
        mapQaSessionToDashboard(event.session),
      );
    }
  });
}
