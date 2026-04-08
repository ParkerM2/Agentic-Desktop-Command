/**
 * Relay message types for cross-device session communication.
 *
 * The relay system allows a "claiming" device to spawn, stream,
 * and kill Claude sessions running on a remote "host" device.
 */

/** Discriminant union of all relay message type strings */
export type RelayMessageType = 'spawn' | 'input' | 'output' | 'kill' | 'ended' | 'resume';

/** Payload for spawning a new agent session on the host device */
export interface SessionSpawnPayload {
  agentRole: string;
  prompt: string;
  workDir: string;
  taskId: string;
}

/** Payload for sending stdin input to a running session */
export interface SessionInputPayload {
  sessionId: string;
  data: string;
}

/** Payload for stdout/stderr output streamed from a running session */
export interface SessionOutputPayload {
  sessionId: string;
  data: string;
  stream: 'stdout' | 'stderr';
}

/** Payload for killing an active session */
export interface SessionKillPayload {
  sessionId: string;
  reason?: string;
}

/** Payload emitted when a session ends (exits) on the host */
export interface SessionEndedPayload {
  sessionId: string;
  exitCode: number;
  endedAt: string;
}

/** Payload for resuming a previously started session */
export interface SessionResumePayload {
  sessionId: string;
}

/** Discriminated union envelope for all relay messages */
export type RelayEnvelope =
  | { type: 'spawn'; sessionId: string; payload: SessionSpawnPayload }
  | { type: 'input'; sessionId: string; payload: SessionInputPayload }
  | { type: 'output'; sessionId: string; payload: SessionOutputPayload }
  | { type: 'kill'; sessionId: string; payload: SessionKillPayload }
  | { type: 'ended'; sessionId: string; payload: SessionEndedPayload }
  | { type: 'resume'; sessionId: string; payload: SessionResumePayload };

/** Event emitted when a remote device claims a project */
export interface ProjectClaimEvent {
  projectId: string;
  claimedByDeviceId: string;
  claimedAt: string;
}

/** Event emitted when a remote device releases a project claim */
export interface ProjectUnclaimEvent {
  projectId: string;
  unclaimedAt: string;
}
