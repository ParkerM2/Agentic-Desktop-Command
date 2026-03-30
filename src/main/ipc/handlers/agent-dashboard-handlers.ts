/**
 * Agent Dashboard IPC Handlers
 *
 * Thin handler layer connecting IPC contracts to agent dashboard services.
 * No business logic — just delegates to service methods and forwards events.
 *
 * Services are accepted as parameters because they may not be instantiated
 * yet during the v2 rollout. The handler registration is decoupled from
 * service construction.
 */

import type { AgentChatMessage, AgentSession, AgentStatus, FileChange, StreamJsonEvent, TeamMember } from '@shared/types/agent-dashboard';

import type { IpcRouter } from '../router';

// ── Service Interfaces ───────────────────────────────────────
// These describe the minimum surface area the handlers need.
// Actual service implementations live in src/main/services/.

export interface AgentManagerService {
  spawnProjectOwner: (config: {
    projectPath: string;
    prompt: string;
    model?: string;
    name?: string;
  }) => Promise<{ sessionId: string; status: 'spawned' }>;

  spawnTeamLead: (config: {
    projectPath: string;
    teamName: string;
    prompt: string;
    model?: string;
    name?: string;
  }) => Promise<{ sessionId: string; tmuxSessionName: string; status: 'spawned' }>;

  listSessions: (filter?: {
    type?: 'project-owner' | 'team-lead' | 'teammate';
    teamName?: string;
  }) => AgentSession[];

  getSession: (sessionId: string) => AgentSession | null;

  sendMessage: (sessionId: string, message: string) => void;

  stopSession: (sessionId: string) => void;

  getFilesChanged: (sessionId: string, branch?: string) => FileChange[];

  onEvent: (
    listener: (
      event:
        | { type: 'session-started'; session: AgentSession }
        | { type: 'session-ended'; sessionId: string; status: AgentStatus; exitCode?: number }
        | { type: 'message-received'; message: AgentChatMessage }
        | {
            type: 'status-changed';
            sessionId: string;
            previousStatus: AgentStatus;
            newStatus: AgentStatus;
          }
        | {
            type: 'stream-event';
            sessionId: string;
            event: StreamJsonEvent;
          },
    ) => void,
  ) => void;
}

export interface TeamWatcherService {
  onTeammateJoined: (listener: (member: TeamMember) => void) => void;
  onTeammateLeft: (listener: (info: { agentId: string; teamName: string }) => void) => void;
}

// ── Handler Registration ─────────────────────────────────────

export function registerAgentDashboardHandlers(
  router: IpcRouter,
  agentManager: AgentManagerService,
  teamWatcher: TeamWatcherService,
): void {
  // ── Invoke Handlers ──────────────────────────────────────

  router.handle('agent-dashboard.spawnProjectOwner', (config) =>
    agentManager.spawnProjectOwner(config),
  );

  router.handle('agent-dashboard.spawnTeamLead', (config) =>
    agentManager.spawnTeamLead(config),
  );

  router.handle('agent-dashboard.listSessions', (filter) =>
    Promise.resolve(agentManager.listSessions(filter)),
  );

  router.handle('agent-dashboard.getSession', ({ sessionId }) =>
    Promise.resolve(agentManager.getSession(sessionId)),
  );

  router.handle('agent-dashboard.sendMessage', ({ sessionId, message }) => {
    agentManager.sendMessage(sessionId, message);
    return Promise.resolve({ success: true });
  });

  router.handle('agent-dashboard.stopSession', ({ sessionId }) => {
    agentManager.stopSession(sessionId);
    return Promise.resolve({ success: true });
  });

  router.handle('agent-dashboard.getFilesChanged', ({ sessionId, branch }) =>
    Promise.resolve(agentManager.getFilesChanged(sessionId, branch)),
  );

  // ── Event Forwarding ─────────────────────────────────────
  // Service events are forwarded to the renderer via IPC events.

  agentManager.onEvent((event) => {
    switch (event.type) {
      case 'session-started': {
        router.emit('event:agent-dashboard.sessionStarted', event.session);
        break;
      }
      case 'session-ended': {
        router.emit('event:agent-dashboard.sessionEnded', {
          sessionId: event.sessionId,
          status: event.status,
          exitCode: event.exitCode,
        });
        break;
      }
      case 'message-received': {
        router.emit('event:agent-dashboard.messageReceived', event.message);
        break;
      }
      case 'status-changed': {
        router.emit('event:agent-dashboard.statusChanged', {
          sessionId: event.sessionId,
          previousStatus: event.previousStatus,
          newStatus: event.newStatus,
        });
        break;
      }
      case 'stream-event': {
        router.emit('event:agent-dashboard.streamEvent', {
          sessionId: event.sessionId,
          event: event.event,
        });
        break;
      }
    }
  });

  teamWatcher.onTeammateJoined((member) => {
    router.emit('event:agent-dashboard.teammateJoined', member);
  });

  teamWatcher.onTeammateLeft((info) => {
    router.emit('event:agent-dashboard.teammateLeft', info);
  });
}
