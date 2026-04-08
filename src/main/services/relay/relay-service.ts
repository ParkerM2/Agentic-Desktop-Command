/**
 * Relay Service
 *
 * Abstracts local vs remote session execution for cross-device Claude sessions.
 *
 * Outgoing (this device is the CLAIMER — working on a remote project):
 *   Wraps commands in relay envelopes and sends through Hub WS to the host device.
 *
 * Incoming (this device is the HOST — another device wants to use our project):
 *   Receives spawn/input/kill envelopes, spawns Claude locally, pipes output back
 *   as session.output envelopes through Hub WS.
 */

import { serviceLogger } from '@main/lib/logger';

import type {
  RelayEnvelope,
  SessionEndedPayload,
  SessionSpawnPayload,
} from '@shared/types/relay';
import type { AgentOrchestrator, SpawnOptions } from '../agent-orchestrator/types';

const relayLogger = serviceLogger;

// ─── Types ────────────────────────────────────────────────────

/** Tracks state for a relay session managed by this device (incoming) */
interface IncomingRelaySession {
  sessionId: string;
  projectId: string;
  localSessionId: string;
  hostDeviceId: string;
  seq: number;
}

/** Tracks state for a relay session on a remote device (outgoing) */
interface OutgoingRelaySession {
  sessionId: string;
  projectId: string;
  hostDeviceId: string;
  lastSeq: number;
}

type RelaySessionState =
  | ({ direction: 'incoming' } & IncomingRelaySession)
  | ({ direction: 'outgoing' } & OutgoingRelaySession);

/** Function that sends a relay envelope through the Hub WebSocket */
export type RelaySendFn = (envelope: RelayEnvelope) => void;

// ─── Interface ────────────────────────────────────────────────

export interface RelayService {
  /**
   * Spawn a session on a remote host device (outgoing — this device is claimer).
   * Returns the sessionId that will be used for subsequent operations.
   */
  spawnRemoteSession: (
    hostDeviceId: string,
    projectId: string,
    payload: SessionSpawnPayload,
  ) => string;

  /**
   * Send stdin input to an active session.
   * For outgoing: wraps in relay envelope and sends through WS.
   * For local sessions: should not be called (handled by AgentOrchestrator).
   */
  sendInput: (sessionId: string, data: string) => void;

  /**
   * Kill an active session.
   * For outgoing: sends kill envelope to remote host.
   */
  killSession: (sessionId: string, reason?: string) => void;

  /**
   * Resume a previously started session (reconnect after disconnect).
   * Sends session.resume envelope with lastSeq to allow replayed messages.
   */
  resumeSession: (sessionId: string) => void;

  /**
   * Handle an incoming relay envelope from Hub WebSocket.
   * Called by hub-ws-client message handler for session.* messages.
   */
  handleIncomingEnvelope: (envelope: RelayEnvelope, fromDeviceId: string) => Promise<void>;

  /**
   * Handle a raw Hub WebSocket message.
   * Parses relay envelopes (type === 'relay') and delegates to handleIncomingEnvelope.
   * Register this via hubConnectionManager.onWebSocketMessage().
   */
  handleHubMessage: (message: unknown) => void;

  /**
   * Check whether a project is a remote project (hosted on another device).
   * Used by AgentOrchestrator to determine if it should delegate to relay.
   */
  isRemoteProject: (projectId: string) => boolean;

  /**
   * Set the function used to send relay envelopes through Hub WebSocket.
   * Called during bootstrap once the WS client is available.
   */
  setSendFn: (fn: RelaySendFn) => void;

  /**
   * Register a remote project for relay routing.
   * Called when a project is claimed from a remote device.
   */
  registerRemoteProject: (projectId: string, hostDeviceId: string) => void;

  /**
   * Unregister a remote project (after unclaim or host disconnect).
   */
  unregisterRemoteProject: (projectId: string) => void;

  /**
   * Get the host device ID for a remote project, if registered.
   */
  getHostDeviceId: (projectId: string) => string | undefined;

  /**
   * Late-bind the agent orchestrator dependency.
   * Must be called after agentOrchestrator is created (circular dep workaround).
   */
  setAgentOrchestrator: (orchestrator: AgentOrchestrator) => void;
}

/** Shape of relay messages forwarded through Hub WebSocket */
interface RelayHubMessage {
  type: 'relay';
  fromDeviceId: string;
  envelope: RelayEnvelope;
}

function isRelayHubMessage(data: unknown): data is RelayHubMessage {
  if (typeof data !== 'object' || data === null) return false;
  const msg = data as Record<string, unknown>;
  return (
    msg.type === 'relay' &&
    typeof msg.fromDeviceId === 'string' &&
    typeof msg.envelope === 'object' &&
    msg.envelope !== null
  );
}

// ─── Factory ─────────────────────────────────────────────────

export function createRelayService(): RelayService {
  // Late-bound via setAgentOrchestrator — null until wired in bootstrap
  let agentOrchestrator: AgentOrchestrator | null = null;

  // Active relay sessions keyed by sessionId
  const sessions = new Map<string, RelaySessionState>();

  // Remote projects: projectId → hostDeviceId
  const remoteProjects = new Map<string, string>();

  // The WS send function — injected after bootstrap
  let sendFn: RelaySendFn | null = null;

  // ── Private helpers ─────────────────────────────────────────

  function send(envelope: RelayEnvelope): void {
    if (!sendFn) {
      relayLogger.warn('[RelayService] send called but no sendFn registered — dropping envelope');
      return;
    }
    sendFn(envelope);
    relayLogger.info(`[RelayService] Sent envelope: type=${envelope.type} session=${envelope.sessionId}`);
  }

  function generateSessionId(): string {
    return `relay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async function handleIncomingSpawn(
    sessionId: string,
    payload: SessionSpawnPayload,
    fromDeviceId: string,
  ): Promise<void> {
    relayLogger.info(`[RelayService] Incoming spawn: session=${sessionId} from=${fromDeviceId}`);

    // Resolve project path from projectId encoded in workDir
    // workDir from the remote claimer should be a valid path on this host
    const spawnOptions: SpawnOptions = {
      taskId: payload.taskId,
      projectPath: payload.workDir,
      prompt: payload.prompt,
      phase: 'executing',
    };

    const orchestrator = agentOrchestrator;
    if (!orchestrator) {
      relayLogger.error('[RelayService] handleIncomingSpawn: agentOrchestrator not set');
      return;
    }

    let localSession;
    try {
      localSession = await orchestrator.spawn(spawnOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      relayLogger.error(`[RelayService] Failed to spawn local session: ${message}`);
      // Notify claimer that session ended with failure
      const endedPayload: SessionEndedPayload = {
        sessionId,
        exitCode: -1,
        endedAt: new Date().toISOString(),
      };
      send({ type: 'ended', sessionId, payload: endedPayload });
      return;
    }

    // Track the incoming session
    const state: RelaySessionState = {
      direction: 'incoming',
      sessionId,
      projectId: payload.workDir,
      localSessionId: localSession.id,
      hostDeviceId: fromDeviceId,
      seq: 0,
    };
    sessions.set(sessionId, state);

    // Subscribe to agent output and pipe back as session.output envelopes
    orchestrator.onSessionEvent((event) => {
      if (event.session.id !== localSession.id) {
        return;
      }

      if (event.type === 'completed' || event.type === 'error' || event.type === 'killed') {
        const exitCode =
          event.type === 'completed' ? 0 : (event.session.exitCode ?? -1);

        const endedPayload: SessionEndedPayload = {
          sessionId,
          exitCode,
          endedAt: new Date().toISOString(),
        };
        send({ type: 'ended', sessionId, payload: endedPayload });
        sessions.delete(sessionId);
      }
    });

    relayLogger.info(
      `[RelayService] Local session spawned: localId=${localSession.id} for relayId=${sessionId}`,
    );
  }

  function handleIncomingInput(sessionId: string, data: string): void {
    const state = sessions.get(sessionId);
    if (!state || state.direction !== 'incoming') {
      relayLogger.warn(`[RelayService] sendInput: no incoming session found for ${sessionId}`);
      return;
    }
    if (!agentOrchestrator) {
      relayLogger.warn('[RelayService] handleIncomingInput: agentOrchestrator not set');
      return;
    }
    agentOrchestrator.sendInput(state.localSessionId, data);
  }

  function handleIncomingKill(sessionId: string, reason?: string): void {
    const state = sessions.get(sessionId);
    if (!state || state.direction !== 'incoming') {
      relayLogger.warn(`[RelayService] kill: no incoming session found for ${sessionId}`);
      return;
    }
    if (!agentOrchestrator) {
      relayLogger.warn('[RelayService] handleIncomingKill: agentOrchestrator not set');
      return;
    }

    relayLogger.info(
      `[RelayService] Killing local session ${state.localSessionId} (relay=${sessionId}, reason=${reason ?? 'none'})`,
    );
    agentOrchestrator.kill(state.localSessionId);
    sessions.delete(sessionId);
  }

  async function handleIncomingEnvelope(envelope: RelayEnvelope, fromDeviceId: string): Promise<void> {
    switch (envelope.type) {
      case 'spawn':
        await handleIncomingSpawn(envelope.sessionId, envelope.payload, fromDeviceId);
        break;

      case 'input':
        handleIncomingInput(envelope.sessionId, envelope.payload.data);
        break;

      case 'kill':
        handleIncomingKill(envelope.sessionId, envelope.payload.reason);
        break;

      case 'ended':
        // A remote session ended — clean up our outgoing session state
        sessions.delete(envelope.sessionId);
        relayLogger.info(`[RelayService] Remote session ended: ${envelope.sessionId}`);
        break;

      case 'output':
        // Output from remote session — logged; IPC handler can surface this
        relayLogger.info(
          `[RelayService] Remote output: session=${envelope.sessionId} stream=${envelope.payload.stream}`,
        );
        break;

      case 'resume':
        // Resume acknowledgement from remote — no local action needed
        relayLogger.info(`[RelayService] Resume ack: session=${envelope.sessionId}`);
        break;

      default: {
        const _exhaustive: never = envelope;
        relayLogger.warn('[RelayService] Unknown envelope type received', _exhaustive);
      }
    }
  }

  // ── Public API ───────────────────────────────────────────────

  return {
    spawnRemoteSession(hostDeviceId, projectId, payload) {
      const sessionId = generateSessionId();

      const state: RelaySessionState = {
        direction: 'outgoing',
        sessionId,
        projectId,
        hostDeviceId,
        lastSeq: 0,
      };
      sessions.set(sessionId, state);

      send({ type: 'spawn', sessionId, payload });

      relayLogger.info(
        `[RelayService] Spawning remote session: id=${sessionId} host=${hostDeviceId} project=${projectId}`,
      );

      return sessionId;
    },

    sendInput(sessionId, data) {
      const state = sessions.get(sessionId);
      if (!state) {
        relayLogger.warn(`[RelayService] sendInput: session not found: ${sessionId}`);
        return;
      }

      send({
        type: 'input',
        sessionId,
        payload: { sessionId, data },
      });
    },

    killSession(sessionId, reason) {
      const state = sessions.get(sessionId);
      if (!state) {
        relayLogger.warn(`[RelayService] killSession: session not found: ${sessionId}`);
        return;
      }

      send({
        type: 'kill',
        sessionId,
        payload: { sessionId, reason },
      });

      sessions.delete(sessionId);
    },

    resumeSession(sessionId) {
      const state = sessions.get(sessionId);
      if (!state) {
        relayLogger.warn(`[RelayService] resumeSession: session not found: ${sessionId}`);
        return;
      }

      send({
        type: 'resume',
        sessionId,
        payload: { sessionId },
      });

      relayLogger.info(`[RelayService] Resuming session: ${sessionId}`);
    },

    handleIncomingEnvelope,

    isRemoteProject(projectId) {
      return remoteProjects.has(projectId);
    },

    setSendFn(fn) {
      sendFn = fn;
      relayLogger.info('[RelayService] Send function registered');
    },

    registerRemoteProject(projectId, hostDeviceId) {
      remoteProjects.set(projectId, hostDeviceId);
      relayLogger.info(
        `[RelayService] Registered remote project: ${projectId} on host ${hostDeviceId}`,
      );
    },

    unregisterRemoteProject(projectId) {
      remoteProjects.delete(projectId);
      relayLogger.info(`[RelayService] Unregistered remote project: ${projectId}`);
    },

    getHostDeviceId(projectId) {
      return remoteProjects.get(projectId);
    },

    handleHubMessage(message) {
      if (!isRelayHubMessage(message)) {
        return;
      }
      relayLogger.info(
        `[RelayService] Hub relay message: type=${message.envelope.type} session=${message.envelope.sessionId} from=${message.fromDeviceId}`,
      );
      void handleIncomingEnvelope(message.envelope, message.fromDeviceId);
    },

    setAgentOrchestrator(orchestrator) {
      agentOrchestrator = orchestrator;
      relayLogger.info('[RelayService] AgentOrchestrator bound');
    },
  };
}
