/**
 * Agent Host Client — Main-process proxy to the Agent Host utility process
 *
 * Implements the same interface as AgentManagerService but communicates
 * over MessagePort channels to the utility process. Maintains a local
 * cache of sessions/messages so synchronous reads (listSessions, getSession,
 * getMessages) return instantly from the cache.
 *
 * The only interface change: spawnProjectOwner and spawnTeamLead return
 * Promises because spawn requires an RPC round-trip to the utility process.
 */

import { randomUUID } from 'node:crypto';

import type { AgentStatus } from '@shared/types/agent-dashboard';

import type {
  ControlRequest,
  ControlReply,
  AgentManagerEvent,
  AgentSession,
  AgentChatMessage,
  AgentSessionType,
  ProjectOwnerConfig,
  TeamLeadConfig,
} from './host-protocol';
import type { SpawnTeamLeadResult } from '../services/agent-manager/agent-manager-service';

/** Local alias — matches the unexported type in agent-manager-service */
type AgentManagerEventHandler = (event: AgentManagerEvent) => void;

// ── Client Interface ────────────────────────────────────────

/**
 * Same shape as AgentManagerService except spawn methods return Promises.
 * This is the only breaking change — callers of spawn must add `await`.
 */
export interface AgentHostClient {
  spawnProjectOwner: (config: ProjectOwnerConfig) => Promise<AgentSession>;
  spawnTeamLead: (config: TeamLeadConfig) => Promise<SpawnTeamLeadResult>;
  listSessions: (filter?: { type?: AgentSessionType; teamName?: string }) => AgentSession[];
  getSession: (sessionId: string) => AgentSession | undefined;
  sendMessage: (sessionId: string, message: string) => boolean;
  stopSession: (sessionId: string) => boolean;
  onEvent: (handler: AgentManagerEventHandler) => () => void;
  getSessionProjectPath: (sessionId: string) => string | undefined;
  getMessages: (sessionId: string) => AgentChatMessage[];
  dispose: () => void;
}

// ── Factory ─────────────────────────────────────────────────

export function createAgentHostClient(
  controlPort: Electron.MessagePortMain,
  eventPort: Electron.MessagePortMain,
): AgentHostClient {
  // Local cache — kept in sync by event port messages
  const sessions = new Map<string, AgentSession>();
  const messageStore = new Map<string, AgentChatMessage[]>();
  const projectPaths = new Map<string, string>();

  // Event subscription
  const eventHandlers = new Set<AgentManagerEventHandler>();

  // Pending RPC requests awaiting a ControlReply
  const pendingRequests = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  // ── Control Port: receive RPC responses ───────────────────

  controlPort.on('message', (e: Electron.MessageEvent) => {
    const reply = e.data as ControlReply;
    const pending = pendingRequests.get(reply.id);
    if (!pending) return;

    pendingRequests.delete(reply.id);

    if (reply.type === 'error') {
      pending.reject(new Error(reply.error));
    } else {
      pending.resolve(reply.result);
    }
  });
  controlPort.start();

  // ── Event Port: update local cache + forward to handlers ──

  eventPort.on('message', (e: Electron.MessageEvent) => {
    const event = e.data as AgentManagerEvent;

    // Update local cache based on event type
    switch (event.type) {
      case 'session.started': {
        const session = event.data as AgentSession;
        sessions.set(event.sessionId, session);
        break;
      }
      case 'session.ended': {
        sessions.delete(event.sessionId);
        messageStore.delete(event.sessionId);
        break;
      }
      case 'status.changed': {
        const existing = sessions.get(event.sessionId);
        if (existing) {
          const { newStatus } = event.data as { newStatus: AgentStatus };
          sessions.set(event.sessionId, { ...existing, status: newStatus });
        }
        break;
      }
      case 'message.received': {
        const msg = event.data as AgentChatMessage;
        const list = messageStore.get(event.sessionId) ?? [];
        list.push(msg);
        messageStore.set(event.sessionId, list);
        break;
      }
      case 'stream.event': {
        // Stream events don't need local caching — just forwarded to handlers below
        break;
      }
    }

    // Forward event to all registered handlers
    for (const handler of eventHandlers) {
      handler(event);
    }
  });
  eventPort.start();

  // ── RPC Helper ────────────────────────────────────────────

  function sendRequest(request: ControlRequest): Promise<unknown> {
    return new Promise((resolve, reject) => {
      pendingRequests.set(request.id, { resolve, reject });
      controlPort.postMessage(request);
    });
  }

  // ── Public API ────────────────────────────────────────────

  return {
    async spawnProjectOwner(config: ProjectOwnerConfig): Promise<AgentSession> {
      const id = randomUUID();
      const result = await sendRequest({ type: 'spawn-project-owner', id, config });
      const session = result as AgentSession;
      sessions.set(session.id, session);
      projectPaths.set(session.id, config.projectPath);
      return session;
    },

    async spawnTeamLead(config: TeamLeadConfig): Promise<SpawnTeamLeadResult> {
      const id = randomUUID();
      const result = await sendRequest({ type: 'spawn-team-lead', id, config });
      const spawnResult = result as SpawnTeamLeadResult;
      // Only cache if spawn succeeded (has an id, meaning it's an AgentSession)
      if ('id' in spawnResult && spawnResult.id) {
        sessions.set(spawnResult.id, spawnResult);
        projectPaths.set(spawnResult.id, config.projectPath);
      }
      return spawnResult;
    },

    listSessions(filter?: { type?: AgentSessionType; teamName?: string }): AgentSession[] {
      let list = [...sessions.values()];
      if (filter?.type) {
        list = list.filter((s) => s.type === filter.type);
      }
      if (filter?.teamName) {
        list = list.filter((s) => s.teamName === filter.teamName);
      }
      return list;
    },

    getSession(sessionId: string): AgentSession | undefined {
      return sessions.get(sessionId);
    },

    sendMessage(sessionId: string, message: string): boolean {
      // Fire-and-forget — post to control port, don't await reply
      const id = randomUUID();
      controlPort.postMessage({
        type: 'send-message',
        id,
        sessionId,
        message,
      } satisfies ControlRequest);
      return true;
    },

    stopSession(sessionId: string): boolean {
      // Fire-and-forget — the event port will notify us of session.ended
      const id = randomUUID();
      controlPort.postMessage({
        type: 'stop-session',
        id,
        sessionId,
      } satisfies ControlRequest);
      return true;
    },

    onEvent(handler: AgentManagerEventHandler): () => void {
      eventHandlers.add(handler);
      return () => {
        eventHandlers.delete(handler);
      };
    },

    getSessionProjectPath(sessionId: string): string | undefined {
      return projectPaths.get(sessionId);
    },

    getMessages(sessionId: string): AgentChatMessage[] {
      return messageStore.get(sessionId) ?? [];
    },

    dispose(): void {
      const id = randomUUID();
      controlPort.postMessage({ type: 'dispose', id } satisfies ControlRequest);
      sessions.clear();
      messageStore.clear();
      projectPaths.clear();
      eventHandlers.clear();
      pendingRequests.clear();
    },
  };
}
