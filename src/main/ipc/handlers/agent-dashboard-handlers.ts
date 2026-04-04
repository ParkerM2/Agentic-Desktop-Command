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
import type { ProgressWatcherV2 } from '../../services/progress-watcher-v2';
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

/** Set of feature slugs that have been lazily watched */
const watchedSlugs = new Set<string>();

export function registerAgentDashboardHandlers(
  router: IpcRouter,
  agentManager: AgentManagerService,
  teamWatcher: TeamWatcherService,
  progressWatcher: ProgressWatcherV2,
  qaRunner: QaRunner,
  gitService: GitService,
): void {
  // ── Invoke Handlers ──────────────────────────────────────

  router.handle('agent-dashboard.spawnProjectOwner', (config) => {
    const session = agentManager.spawnProjectOwner(config);
    return Promise.resolve({ sessionId: session.id, status: 'spawned' as const });
  });

  router.handle('agent-dashboard.spawnTeamLead', (config) => {
    const result = agentManager.spawnTeamLead(config);
    if ('error' in result) {
      throw new Error(`spawnTeamLead failed: ${result.error}`);
    }
    return Promise.resolve({
      sessionId: result.id,
      status: 'spawned' as const,
    });
  });

  router.handle('agent-dashboard.listSessions', (filter) =>
    Promise.resolve(agentManager.listSessions(filter)),
  );

  router.handle('agent-dashboard.getSession', ({ sessionId }) =>
    Promise.resolve(agentManager.getSession(sessionId) ?? null),
  );

  router.handle('agent-dashboard.sendMessage', ({ sessionId, message }) =>
    Promise.resolve({ success: agentManager.sendMessage(sessionId, message) }),
  );

  router.handle('agent-dashboard.stopSession', ({ sessionId }) =>
    Promise.resolve({ success: agentManager.stopSession(sessionId) }),
  );

  router.handle('agent-dashboard.getFilesChanged', (input) => {
    const projectPath = agentManager.getSessionProjectPath(input.sessionId);
    if (!projectPath) {
      return Promise.resolve([]);
    }
    return gitService.getFilesChanged(projectPath, input.branch);
  });

  // ── Workflow Task Handlers ──────────────────────────────────

  router.handle('agent-dashboard.getTasksForFeature', (input) => {
    // Lazily start watching the feature on first request
    if (!watchedSlugs.has(input.featureSlug)) {
      progressWatcher.watchFeature(input.featureSlug);
      watchedSlugs.add(input.featureSlug);
    }
    return Promise.resolve(progressWatcher.getTasksForFeature(input.featureSlug));
  });

  router.handle('agent-dashboard.getTask', (input) =>
    Promise.resolve(progressWatcher.getTask(input.featureSlug, input.taskNumber)),
  );

  // ── QA Handlers ─────────────────────────────────────────────

  router.handle('agent-dashboard.getQaSession', (input) => {
    const session = qaRunner.getSessionByTaskId(input.taskId);
    return Promise.resolve(session ? mapQaSessionToDashboard(session) : null);
  });

  router.handle('agent-dashboard.listQaSessions', () =>
    Promise.resolve(qaRunner.listSessions().map(mapQaSessionToDashboard)),
  );

  // ── Event Forwarding ─────────────────────────────────────
  // Agent manager events are emitted directly by the service via router.
  // Only teammate join/leave events need forwarding from TeamWatcher.

  teamWatcher.onTeammateJoined((member) => {
    router.emit('event:agent-dashboard.teammateJoined', member);
  });

  teamWatcher.onTeammateLeft((memberId) => {
    router.emit('event:agent-dashboard.teammateLeft', { agentId: memberId, teamName: '' });
  });

  // Forward task updates from ProgressWatcherV2 (debounced per-slug to avoid thundering herd)
  const debounceTimers = new Map<string, NodeJS.Timeout>();

  progressWatcher.onTaskUpdated((slug, task) => {
    clearTimeout(debounceTimers.get(slug));
    debounceTimers.set(
      slug,
      setTimeout(() => {
        router.emit('event:agent-dashboard.taskUpdated', { featureSlug: slug, task });
      }, 50),
    );
  });

  // Forward QA session events (progress + completed only)
  qaRunner.onSessionEvent((event) => {
    if (event.type === 'completed' || event.type === 'progress') {
      router.emit(
        'event:agent-dashboard.qaSessionUpdated',
        mapQaSessionToDashboard(event.session),
      );
    }
  });
}
