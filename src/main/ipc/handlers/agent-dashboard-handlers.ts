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

import type { TeamMember } from '@shared/types/agent-dashboard';

import type { IpcRouter } from '../router';
import type { AgentManagerService } from '../../services/agent-manager';

// ── Service Interfaces ───────────────────────────────────────

export interface TeamWatcherService {
  onTeammateJoined: (listener: (member: TeamMember) => void) => void;
  onTeammateLeft: (listener: (memberId: string) => void) => void;
}

// ── Handler Registration ─────────────────────────────────────

export function registerAgentDashboardHandlers(
  router: IpcRouter,
  agentManager: AgentManagerService,
  teamWatcher: TeamWatcherService,
): void {
  // ── Invoke Handlers ──────────────────────────────────────

  router.handle('agent-dashboard.spawnProjectOwner', (config) => {
    const session = agentManager.spawnProjectOwner(config);
    return Promise.resolve({ sessionId: session.id, status: 'spawned' as const });
  });

  router.handle('agent-dashboard.spawnTeamLead', (config) => {
    const session = agentManager.spawnTeamLead(config);
    return Promise.resolve({
      sessionId: session.id,
      tmuxSessionName: session.name,
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

  router.handle('agent-dashboard.getFilesChanged', (_input) =>
    Promise.resolve([]),
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
}
