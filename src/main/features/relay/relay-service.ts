/**
 * Relay Service
 *
 * Core service for cross-device relay sessions. Handles both outgoing
 * (this device claims a remote project) and incoming (another device
 * claims our project) relay scenarios.
 *
 * Outgoing: claim/release/renew via Hub REST, spawn/input/kill via WS
 * Incoming: receive WS envelopes, spawn local agent, pipe output back
 */

import { RELAY_EVENTS } from '@shared/ipc/relay/channels';
import type {
  RelaySession,
  SessionEndedPayload,
  SessionSpawnPayload,
} from '@shared/types/relay';

import { createScopedLogger } from '../../lib/logger';

import type { IpcRouter } from '../../ipc/router';
import type { AgentManagerService } from '../../services/agent-manager/agent-manager-service';
import type { HubApiClient } from '../hub/hub-api-client';
import type { HubConnectionManager } from '../hub/hub-connection';

const log = createScopedLogger('relay');

// ─── Constants ────────────────────────────────────────────────

/** Claim renewal interval: 45 seconds (claim expires at 60s). */
const CLAIM_RENEWAL_INTERVAL_MS = 45_000;

/** WS message type for session ended. */
const SESSION_ENDED_TYPE = 'session.ended';

// ─── Internal Types ───────────────────────────────────────────

/** Tracks state for a relay session managed by this device (incoming — we are host). */
interface IncomingRelaySession {
  direction: 'incoming';
  sessionId: string;
  projectId: string;
  localSessionId: string;
  sourceDeviceId: string;
  startedAt: string;
}

/** Tracks state for a relay session on a remote device (outgoing — we are claimer). */
interface OutgoingRelaySession {
  direction: 'outgoing';
  sessionId: string;
  projectId: string;
  hostDeviceId: string;
  startedAt: string;
}

type RelaySessionState = IncomingRelaySession | OutgoingRelaySession;

/** Function that sends a relay message through the Hub WebSocket. */
export type RelaySendFn = (message: Record<string, unknown>) => void;

// ─── Claim Result ─────────────────────────────────────────────

export interface ClaimResult {
  success: boolean;
  claimedAt: string;
  deviceId: string;
}

// ─── Interface ────────────────────────────────────────────────

export interface RelayService {
  /** Claim a remote project via Hub REST API. Starts renewal timer. */
  claimProject: (projectId: string) => Promise<ClaimResult>;
  /** Release a project claim. Stops renewal timer. */
  releaseProject: (projectId: string) => Promise<void>;
  /** Force-reclaim a project (host takes back control). */
  forceReclaimProject: (projectId: string) => Promise<void>;
  /** Manually renew a claim. Usually handled by the auto-renewal timer. */
  renewClaim: (projectId: string) => Promise<void>;
  /** Spawn a session on a remote host device (outgoing). Returns sessionId. */
  spawnRemoteSession: (projectId: string, payload: SessionSpawnPayload) => string;
  /** Send stdin input to an outgoing relay session. */
  sendInput: (sessionId: string, data: string) => void;
  /** Handle an incoming WS message from Hub. Parses relay envelopes. */
  handleIncomingMessage: (message: unknown) => void;
  /** List all tracked relay sessions (both incoming and outgoing). */
  listSessions: (projectId?: string) => RelaySession[];
  /** Get buffered session messages from Hub. */
  getBuffer: (sessionId: string) => Promise<{
    sessionId: string;
    messages: Array<{ seq: number; message: unknown; timestamp: string }>;
  }>;
  /** Set the function used to send WS messages. Called during bootstrap. */
  setSendFn: (fn: RelaySendFn) => void;
  /** Set the device ID for this device. Called after device registration. */
  setDeviceId: (id: string) => void;
  /** Clean up timers and sessions. */
  dispose: () => void;
}

// ─── Factory ──────────────────────────────────────────────────

export function createRelayService(deps: {
  hubApiClient: HubApiClient;
  hubConnectionManager: HubConnectionManager;
  router: IpcRouter;
  agentManagerService: AgentManagerService;
}): RelayService {
  const { hubApiClient, hubConnectionManager, router, agentManagerService } = deps;

  // Active relay sessions keyed by sessionId
  const sessions = new Map<string, RelaySessionState>();

  // Claim renewal timers keyed by projectId
  const renewalTimers = new Map<string, ReturnType<typeof setInterval>>();

  // Event listener cleanup functions keyed by sessionId (C1/C2 fix)
  const sessionCleanups = new Map<string, () => void>();

  // WS send function — injected after bootstrap via setSendFn
  let sendFn: RelaySendFn | null = null;

  // Device ID for this device — injected after device registration
  let deviceId: string | null = null;

  // ── Private Helpers ─────────────────────────────────────────

  function send(message: Record<string, unknown>): void {
    if (!sendFn) {
      log.warn('send called but no sendFn registered — dropping message');
      return;
    }
    sendFn(message);
  }

  function generateSessionId(): string {
    return `relay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function getDeviceIdOrThrow(): string {
    if (!deviceId) {
      throw new Error('Device not registered — cannot perform relay operations');
    }
    return deviceId;
  }

  function startRenewalTimer(projectId: string): void {
    stopRenewalTimer(projectId);

    const timerId = setInterval(() => {
      void renewClaimInternal(projectId).catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        log.error(`Claim renewal failed for project ${projectId}: ${msg}`);
      });
    }, CLAIM_RENEWAL_INTERVAL_MS);

    renewalTimers.set(projectId, timerId);
    log.info(
      `Claim renewal timer started for project ${projectId} (every ${String(CLAIM_RENEWAL_INTERVAL_MS / 1000)}s)`,
    );
  }

  function stopRenewalTimer(projectId: string): void {
    const existing = renewalTimers.get(projectId);
    if (existing) {
      clearInterval(existing);
      renewalTimers.delete(projectId);
      log.info(`Claim renewal timer stopped for project ${projectId}`);
    }
  }

  async function renewClaimInternal(projectId: string): Promise<void> {
    const did = getDeviceIdOrThrow();
    const result = await hubApiClient.hubPost<{
      success: boolean;
      data?: { expiresAt: string };
    }>(
      `/api/projects/${encodeURIComponent(projectId)}/renew-claim`,
      { deviceId: did },
    );

    if (!result.ok) {
      log.warn(`Claim renewal failed for ${projectId}: ${result.error ?? 'unknown'}`);
      // If claim expired or not found, stop renewal and clean up
      if (result.statusCode === 404) {
        stopRenewalTimer(projectId);
        log.warn(`Claim for ${projectId} no longer exists — stopping renewal`);
      }
      return;
    }

    log.info(`Claim renewed for project ${projectId}`);
  }

  // ── Incoming Envelope Handlers ──────────────────────────────

  function toStr(val: unknown): string {
    return typeof val === 'string' ? val : '';
  }

  function handleIncomingSpawn(
    sessionId: string,
    projectId: string,
    sourceDeviceId: string,
    data: Record<string, unknown>,
  ): void {
    log.info(
      `Incoming spawn: session=${sessionId} project=${projectId} from=${sourceDeviceId}`,
    );

    const payload: SessionSpawnPayload = {
      agentRole: toStr(data.agentRole) || 'service-engineer',
      prompt: toStr(data.prompt),
      workDir: toStr(data.workDir),
      taskId: toStr(data.taskId),
    };

    // Spawn a local agent session via AgentManagerService
    let localSession;
    try {
      localSession = agentManagerService.spawnProjectOwner({
        projectPath: payload.workDir,
        prompt: payload.prompt,
        name: `relay-${sessionId}`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Failed to spawn local session for relay ${sessionId}: ${msg}`);

      // Notify claimer that session ended with failure
      send({
        type: SESSION_ENDED_TYPE,
        sessionId,
        data: { exitCode: -1, endedAt: new Date().toISOString(), error: msg },
      });
      return;
    }

    // Track the incoming session
    const now = new Date().toISOString();
    const state: IncomingRelaySession = {
      direction: 'incoming',
      sessionId,
      projectId,
      localSessionId: localSession.id,
      sourceDeviceId,
      startedAt: now,
    };
    sessions.set(sessionId, state);

    // Subscribe to agent events and pipe output back as WS envelopes
    const unsubscribe = agentManagerService.onEvent((event) => {
      if (event.sessionId !== localSession.id) {
        return;
      }

      if (event.type === 'session.ended') {
        const eventData = event.data as { exitCode?: number } | undefined;
        const exitCode = eventData?.exitCode ?? 0;
        const endedPayload: SessionEndedPayload = {
          sessionId,
          exitCode,
          endedAt: new Date().toISOString(),
        };

        send({
          type: SESSION_ENDED_TYPE,
          sessionId,
          data: endedPayload,
        });

        sessions.delete(sessionId);
        sessionCleanups.delete(sessionId);
        unsubscribe();
      } else if (event.type === 'stream.event') {
        // Pipe agent output back to claimer via WS (Gap E fix)
        const eventData = event.data as { data?: string; stream?: string } | undefined;
        send({
          type: 'session.output',
          sessionId,
          data: {
            data: eventData?.data ?? '',
            stream: eventData?.stream ?? 'stdout',
          },
        });
      }
    });

    // Track cleanup for this session's listener (C1/C2 fix)
    sessionCleanups.set(sessionId, unsubscribe);

    log.info(`Local session spawned: localId=${localSession.id} for relayId=${sessionId}`);
  }

  function handleIncomingInput(sessionId: string, data: Record<string, unknown>): void {
    const state = sessions.get(sessionId);
    if (state?.direction !== 'incoming') {
      log.warn(`handleIncomingInput: no incoming session found for ${sessionId}`);
      return;
    }
    agentManagerService.sendMessage(state.localSessionId, toStr(data.data));
  }

  function handleIncomingKill(sessionId: string): void {
    const state = sessions.get(sessionId);
    if (state?.direction !== 'incoming') {
      log.warn(`handleIncomingKill: no incoming session found for ${sessionId}`);
      return;
    }
    log.info(`Killing local session ${state.localSessionId} (relay=${sessionId})`);
    agentManagerService.stopSession(state.localSessionId);
    sessions.delete(sessionId);
    // Clean up event listener (C1 fix)
    const cleanup = sessionCleanups.get(sessionId);
    if (cleanup) {
      cleanup();
      sessionCleanups.delete(sessionId);
    }
  }

  function handleIncomingOutput(sessionId: string, data: Record<string, unknown>): void {
    // Output from host device to claimer — emit IPC event (Gap A fix)
    const state = sessions.get(sessionId);
    if (state?.direction !== 'outgoing') {
      log.warn(`handleIncomingOutput: no outgoing session found for ${sessionId}`);
      return;
    }

    const stream = data.stream === 'stderr' ? 'stderr' : 'stdout';

    router.emit(RELAY_EVENTS.SESSION.OUTPUT, {
      sessionId,
      data: toStr(data.data),
      stream,
    });
  }

  function handleIncomingEnded(sessionId: string, data: Record<string, unknown>): void {
    const state = sessions.get(sessionId);
    if (!state) {
      log.warn(`handleIncomingEnded: no session found for ${sessionId}`);
      return;
    }

    if (state.direction === 'outgoing') {
      // Remote session ended — notify renderer
      const exitCode = typeof data.exitCode === 'number' ? data.exitCode : -1;
      const endedAt = typeof data.endedAt === 'string' ? data.endedAt : new Date().toISOString();

      router.emit(RELAY_EVENTS.SESSION.ENDED, {
        sessionId,
        exitCode,
        endedAt,
      });

      sessions.delete(sessionId);
      log.info(`Outgoing relay session ended: ${sessionId} (exitCode=${String(exitCode)})`);
    } else {
      // Incoming session ended acknowledgment — clean up
      sessions.delete(sessionId);
      log.info(`Incoming relay session ended: ${sessionId}`);
    }
  }

  function handleClaimReclaimed(data: Record<string, unknown>): void {
    // Gap D fix: another device force-reclaimed our project
    const projectId = toStr(data.projectId);
    const reclaimedByDeviceId = toStr(data.reclaimedByDeviceId);

    log.warn(`Project ${projectId} was reclaimed by device ${reclaimedByDeviceId}`);

    // Stop renewal timer
    stopRenewalTimer(projectId);

    // Terminate all outgoing sessions for this project
    for (const [sid, state] of sessions) {
      if (state.direction === 'outgoing' && state.projectId === projectId) {
        router.emit(RELAY_EVENTS.SESSION.ENDED, {
          sessionId: sid,
          exitCode: -1,
          endedAt: new Date().toISOString(),
        });
        sessions.delete(sid);
      }
    }

    // Emit reclaim event to renderer
    router.emit(RELAY_EVENTS.CLAIM.RECLAIMED, {
      projectId,
      reclaimedByDeviceId,
      reclaimedAt: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
    });
  }

  // ── Register WS listener ───────────────────────────────────

  hubConnectionManager.onWebSocketMessage((wsData: unknown) => {
    handleIncomingMessage(wsData);
  });

  // ── Public API ──────────────────────────────────────────────

  function handleIncomingMessage(message: unknown): void {
    if (typeof message !== 'object' || message === null) {
      return;
    }

    const msg = message as Record<string, unknown>;
    const { type } = msg;

    if (typeof type !== 'string') {
      return;
    }

    // Handle claim.reclaimed (Gap D)
    if (type === 'claim.reclaimed') {
      handleClaimReclaimed(msg);
      return;
    }

    // Only process session.* relay messages
    if (!type.startsWith('session.')) {
      return;
    }

    const sessionId = typeof msg.sessionId === 'string' ? msg.sessionId : '';
    if (!sessionId) {
      log.warn(`Relay message missing sessionId: type=${type}`);
      return;
    }

    const data = (typeof msg.data === 'object' && msg.data !== null
      ? msg.data
      : {}) as Record<string, unknown>;

    switch (type) {
      case 'session.spawn': {
        const projectId = typeof msg.projectId === 'string' ? msg.projectId : '';
        const sourceDeviceId = typeof msg.sourceDeviceId === 'string' ? msg.sourceDeviceId : '';
        handleIncomingSpawn(sessionId, projectId, sourceDeviceId, data);
        break;
      }
      case 'session.input':
        handleIncomingInput(sessionId, data);
        break;
      case 'session.output':
        handleIncomingOutput(sessionId, data);
        break;
      case 'session.kill':
        handleIncomingKill(sessionId);
        break;
      case SESSION_ENDED_TYPE:
        handleIncomingEnded(sessionId, data);
        break;
      case 'session.resume_complete':
        log.info(`Resume complete for session ${sessionId}`);
        break;
      default:
        // Unknown session.* message — ignore
        break;
    }
  }

  return {
    async claimProject(projectId) {
      const did = getDeviceIdOrThrow();

      const result = await hubApiClient.hubPost<{
        success: boolean;
        data: { projectId: string; claimedByDeviceId: string; expiresAt: string };
      }>(
        `/api/projects/${encodeURIComponent(projectId)}/claim`,
        { deviceId: did },
      );

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to claim project ${projectId}`);
      }

      // Start claim renewal timer (Gap C fix)
      startRenewalTimer(projectId);

      const claimResult: ClaimResult = {
        success: true,
        claimedAt: new Date().toISOString(),
        deviceId: did,
      };

      // Emit claimed event to renderer
      router.emit(RELAY_EVENTS.PROJECT.CLAIMED, {
        projectId,
        claimedByDeviceId: did,
        claimedAt: claimResult.claimedAt,
      });

      log.info(`Project claimed: ${projectId}`);
      return claimResult;
    },

    async releaseProject(projectId) {
      const did = getDeviceIdOrThrow();

      // Stop renewal timer
      stopRenewalTimer(projectId);

      const result = await hubApiClient.hubPost<{ success: boolean }>(
        `/api/projects/${encodeURIComponent(projectId)}/release`,
        { deviceId: did },
      );

      if (!result.ok) {
        throw new Error(result.error ?? `Failed to release project ${projectId}`);
      }

      // Clean up outgoing sessions for this project
      for (const [sid, state] of sessions) {
        if (state.direction === 'outgoing' && state.projectId === projectId) {
          sessions.delete(sid);
        }
      }

      // Emit unclaimed event to renderer
      router.emit(RELAY_EVENTS.PROJECT.UNCLAIMED, {
        projectId,
        unclaimedAt: new Date().toISOString(),
      });

      log.info(`Project released: ${projectId}`);
    },

    async forceReclaimProject(projectId) {
      const did = getDeviceIdOrThrow();

      const result = await hubApiClient.hubPost<{
        success: boolean;
        data: { projectId: string; claimedByDeviceId: string; expiresAt: string };
      }>(
        `/api/projects/${encodeURIComponent(projectId)}/force-reclaim`,
        { deviceId: did },
      );

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to force-reclaim project ${projectId}`);
      }

      // Start renewal timer — we now hold the claim (I3 fix)
      startRenewalTimer(projectId);

      log.info(`Project force-reclaimed: ${projectId}`);
    },

    async renewClaim(projectId) {
      await renewClaimInternal(projectId);
    },

    spawnRemoteSession(projectId, payload) {
      const sessionId = generateSessionId();

      // Track as outgoing session
      const state: OutgoingRelaySession = {
        direction: 'outgoing',
        sessionId,
        projectId,
        hostDeviceId: '', // Host device is determined by the Hub
        startedAt: new Date().toISOString(),
      };
      sessions.set(sessionId, state);

      // Send spawn envelope via WS
      send({
        type: 'session.spawn',
        sessionId,
        projectId,
        data: {
          agentRole: payload.agentRole,
          prompt: payload.prompt,
          workDir: payload.workDir,
          taskId: payload.taskId,
        },
      });

      // Emit spawned event to renderer
      router.emit(RELAY_EVENTS.SESSION.SPAWNED, {
        sessionId,
        projectId,
        agentRole: payload.agentRole,
      });

      log.info(`Remote session spawned: ${sessionId} on project ${projectId}`);
      return sessionId;
    },

    sendInput(sessionId, data) {
      const state = sessions.get(sessionId);
      if (state?.direction !== 'outgoing') {
        log.warn(`sendInput: no outgoing session found for ${sessionId}`);
        return;
      }

      send({
        type: 'session.input',
        sessionId,
        data: { data },
      });
    },

    handleIncomingMessage,

    listSessions(projectId) {
      const result: RelaySession[] = [];

      for (const state of sessions.values()) {
        if (projectId && state.projectId !== projectId) {
          continue;
        }

        result.push({
          sessionId: state.sessionId,
          projectId: state.projectId,
          status: 'active',
          source: state.direction === 'outgoing' ? 'relay' : 'local',
          startedAt: state.startedAt,
        });
      }

      return result;
    },

    async getBuffer(sessionId) {
      const result = await hubApiClient.hubGet<{
        success: boolean;
        data: {
          sessionId: string;
          messages: Array<{ seq: number; message: unknown; timestamp: string }>;
        };
      }>(`/api/sessions/${encodeURIComponent(sessionId)}/replay`);

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to get buffer for session ${sessionId}`);
      }

      return result.data.data;
    },

    setSendFn(fn) {
      sendFn = fn;
      log.info('WS send function registered');
    },

    setDeviceId(id) {
      deviceId = id;
      log.info(`Device ID set: ${id}`);
    },

    dispose() {
      // Stop all renewal timers
      for (const [projectId, timerId] of renewalTimers) {
        clearInterval(timerId);
        log.info(`Renewal timer cleared for project ${projectId}`);
      }
      renewalTimers.clear();

      // Stop all incoming sessions and clean up listeners (C2 fix)
      for (const [sid, state] of sessions) {
        if (state.direction === 'incoming') {
          agentManagerService.stopSession(state.localSessionId);
          log.info(`Stopped incoming session: ${sid}`);
        }
      }
      sessions.clear();

      // Clean up all event listener subscriptions
      for (const cleanup of sessionCleanups.values()) {
        cleanup();
      }
      sessionCleanups.clear();

      log.info('Relay service disposed');
    },
  };
}
