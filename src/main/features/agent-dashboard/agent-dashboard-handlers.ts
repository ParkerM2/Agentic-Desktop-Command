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

import { readFileSync } from 'node:fs';

import { AGENT_DASHBOARD, AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';
import type {
  QaDashboardIssue,
  QaDashboardSession,
  QaVerdict,
  QaVerificationStatus,
  QaVerificationSuite,
  TeamMember,
} from '@shared/types/agent-dashboard';

import { findSessionFile } from '../visualization/session-log';

import type { AgentManager } from '../../agent-host/agent-host-client';
import type { BusSessionManager } from '../../bus/session-manager';
import type { IpcRouter } from '../../ipc/router';
import type { GitService } from '../git/git-service';
import type { QaRunner, QaSession } from '../qa/qa-types';

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

// ── Session Status Mapping ───────────────────────────────────

type DashboardStatus = 'running' | 'idle' | 'needs-attention' | 'failed' | 'completed';

/** Map BusSessionManager status strings to AgentDashboardStatus enum values. */
function mapSessionStatus(status: string): DashboardStatus {
  switch (status) {
    case 'active':
    case 'spawning':
      return 'running';
    case 'completed':
      return 'completed';
    case 'error':
    case 'killed':
      return 'failed';
    default:
      return 'idle';
  }
}

// ── Handler Registration ─────────────────────────────────────

export function registerAgentDashboardHandlers(
  router: IpcRouter,
  agentManager: AgentManager,
  teamWatcher: TeamWatcherService,
  qaRunner: QaRunner,
  gitService: GitService,
  busSessionManager: BusSessionManager,
): void {
  // ── Invoke Handlers ──────────────────────────────────────

  router.handle(AGENT_DASHBOARD.SPAWN['PROJECT-OWNER'], async (config) => {
    const session = await agentManager.spawnProjectOwner(config);
    return { sessionId: session.id, status: 'spawned' as const };
  });

  router.handle(AGENT_DASHBOARD.SPAWN['TEAM-LEAD'], async (config) => {
    const result = await agentManager.spawnTeamLead(config);
    if ('error' in result) {
      throw new Error(`spawnTeamLead failed: ${result.error}`);
    }
    return {
      sessionId: result.id,
      status: 'spawned' as const,
    };
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

  // ── Workflow Task Handlers (deprecated — kept for backward compat) ──

  // TASKS-FOR-FEATURE: The old per-feature task breakdown is no longer used.
  // ProgressService.listTasks() returns all tasks, not per-feature.
  // Kept as empty-array stub so the renderer hook doesn't break.
  router.handle(AGENT_DASHBOARD.GET['TASKS-FOR-FEATURE'], (_input) =>
    Promise.resolve([]),
  );

  // GET.TASK: The old workflow task lookup by featureSlug+taskNumber is no longer used.
  // Individual tasks are now queried via PROGRESS.GET.TASK by slug.
  // Kept as null stub so the renderer hook doesn't break.
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

  router.handle(AGENT_DASHBOARD.LIST['SESSIONS-FOR-TASK'], (input) => {
    const sessions = busSessionManager.list({ taskSlug: input.slug });
    const mapped = sessions.map((s) => {
      const tokenUsage = (s.tokenUsage as { input?: number; output?: number } | null) ?? {};
      return {
        sessionId: s.id,
        name: s.name,
        role: s.type,
        taskSlug: s.taskSlug ?? input.slug,
        taskNumber: s.taskIndex,
        status: mapSessionStatus(s.status),
        branch: s.worktreePath,
        model: s.model ?? 'unknown',
        tokenUsage: {
          input: tokenUsage.input ?? 0,
          output: tokenUsage.output ?? 0,
        },
        startedAt: s.startedAt,
        lastActivityAt: s.endedAt ?? s.startedAt,
        exitCode: s.exitCode,
        isTeamLead: s.type === 'team-lead',
      };
    });
    return Promise.resolve(mapped);
  });

  router.handle(AGENT_DASHBOARD.GET['SESSION-LOG'], (input) => {
    const session = busSessionManager.get(input.sessionId);
    if (!session) return Promise.resolve([]);

    // Read JSONL session file from the agent's project path
    const projectPath = agentManager.getSessionProjectPath(input.sessionId);
    if (!projectPath) return Promise.resolve([]);

    try {
      const filePath = findSessionFile(projectPath, input.sessionId);
      if (!filePath) return Promise.resolve([]);

      const raw = readFileSync(filePath, 'utf-8');
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);

      const offset = input.offset ?? 0;
      const limit = input.limit ?? 100;
      const slice = lines.slice(offset, offset + limit);

      const entries: Array<Record<string, unknown>> = [];
      for (const line of slice) {
        try {
          entries.push(JSON.parse(line) as Record<string, unknown>);
        } catch {
          // skip unparseable lines
        }
      }

      return Promise.resolve(entries);
    } catch {
      // File not found or read error — return empty
      return Promise.resolve([]);
    }
  });

  router.handle(AGENT_DASHBOARD.GET['GIT-DIFF'], async (input) => {
    const projectPath = agentManager.getSessionProjectPath(input.sessionId);
    if (!projectPath) return { diff: '' };

    try {
      const files = await gitService.getFilesChanged(projectPath);
      if (files.length === 0) return { diff: '' };

      // Build a summary diff from the changed files
      const diffLines = files.map((f) =>
        `${f.status} ${f.path} (+${String(f.additions)} -${String(f.deletions)})`,
      );
      return { diff: diffLines.join('\n') };
    } catch {
      return { diff: '' };
    }
  });

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
