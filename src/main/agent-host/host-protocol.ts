/**
 * Agent Host Protocol Types
 *
 * Defines the messages exchanged between:
 * - Main process <-> Agent Host utility process (control channel)
 * - Agent Host utility process -> Renderer (event channel)
 */

import type { AgentChatMessage, AgentSession, AgentSessionType } from '@shared/types/agent-dashboard';

import type {
  AgentManagerEvent,
  ProjectOwnerConfig,
  TeamLeadConfig,
} from '../services/agent-manager/agent-manager-service';

// ── Control Channel: Request Types (main -> agent host) ─────

/** Spawn a headless Project Owner session */
export interface SpawnProjectOwnerRequest {
  type: 'spawn-project-owner';
  id: string;
  config: ProjectOwnerConfig;
}

/** Spawn a Team Lead session */
export interface SpawnTeamLeadRequest {
  type: 'spawn-team-lead';
  id: string;
  config: TeamLeadConfig;
}

/** Stop a running session */
export interface StopSessionRequest {
  type: 'stop-session';
  id: string;
  sessionId: string;
}

/** Send a message to a running session */
export interface SendMessageRequest {
  type: 'send-message';
  id: string;
  sessionId: string;
  message: string;
}

/** List sessions, optionally filtered by type or team */
export interface ListSessionsRequest {
  type: 'list-sessions';
  id: string;
  filter?: { type?: AgentSessionType; teamName?: string };
}

/** Get a single session by ID */
export interface GetSessionRequest {
  type: 'get-session';
  id: string;
  sessionId: string;
}

/** Get chat messages for a session */
export interface GetMessagesRequest {
  type: 'get-messages';
  id: string;
  sessionId: string;
}

/** Get the project path for a session */
export interface GetSessionProjectPathRequest {
  type: 'get-session-project-path';
  id: string;
  sessionId: string;
}

/** Tear down all sessions and clean up */
export interface DisposeRequest {
  type: 'dispose';
  id: string;
}

/** Union of all control channel requests */
export type ControlRequest =
  | SpawnProjectOwnerRequest
  | SpawnTeamLeadRequest
  | StopSessionRequest
  | SendMessageRequest
  | ListSessionsRequest
  | GetSessionRequest
  | GetMessagesRequest
  | GetSessionProjectPathRequest
  | DisposeRequest;

// ── Control Channel: Response Types (agent host -> main) ────

/** Successful response with correlation ID */
export interface ControlResponse {
  type: 'response';
  id: string;
  result: unknown;
}

/** Error response with correlation ID */
export interface ControlError {
  type: 'error';
  id: string;
  error: string;
}

/** Union of control channel replies */
export type ControlReply = ControlResponse | ControlError;

// ── Event Channel (agent host -> renderer + main) ───────────

/**
 * Events are fire-and-forget. The agent host emits AgentManagerEvent
 * instances to both:
 * - Main process (for BusSessionManager to persist)
 * - Renderer (for UI updates via direct MessagePort)
 *
 * Re-exported for convenience; the event shape is AgentManagerEvent
 * from agent-manager-service.
 */
export type { AgentManagerEvent };

// ── Init Message (main -> agent host, once at startup) ──────

/**
 * Sent once at startup to initialize the agent host utility process.
 * MessagePorts are transferred via the transfer list, not in the message body.
 */
export interface AgentHostInitMessage {
  type: 'init';
}

// ── Re-exports for consumer convenience ─────────────────────

export type { AgentChatMessage, AgentSession, AgentSessionType };
export type { ProjectOwnerConfig, TeamLeadConfig };
