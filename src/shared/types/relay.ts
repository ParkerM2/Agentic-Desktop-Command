/**
 * Relay Types
 *
 * Types for the hub relay system — WebSocket-based remote session
 * management, project claiming, and session I/O streaming.
 */

export type RelayMessageType = 'spawn' | 'input' | 'output' | 'kill' | 'ended' | 'resume';

export interface SessionSpawnPayload {
  agentRole: string;
  prompt: string;
  workDir: string;
  taskId: string;
}

export interface SessionInputPayload {
  sessionId: string;
  data: string;
}

export interface SessionOutputPayload {
  sessionId: string;
  data: string;
  stream: 'stdout' | 'stderr';
}

export interface SessionKillPayload {
  sessionId: string;
  reason?: string;
}

export interface SessionEndedPayload {
  sessionId: string;
  exitCode: number;
  endedAt: string;
}

export interface SessionResumePayload {
  sessionId: string;
}

export type RelayEnvelope =
  | { type: 'spawn'; sessionId: string; payload: SessionSpawnPayload }
  | { type: 'input'; sessionId: string; payload: SessionInputPayload }
  | { type: 'output'; sessionId: string; payload: SessionOutputPayload }
  | { type: 'kill'; sessionId: string; payload: SessionKillPayload }
  | { type: 'ended'; sessionId: string; payload: SessionEndedPayload }
  | { type: 'resume'; sessionId: string; payload: SessionResumePayload };

export interface ProjectClaimEvent {
  projectId: string;
  claimedByDeviceId: string;
  claimedAt: string;
}

export interface ProjectUnclaimEvent {
  projectId: string;
  unclaimedAt: string;
}

export interface ClaimReclaimedEvent {
  projectId: string;
  reclaimedByDeviceId: string;
  reclaimedAt: string;
}

export interface RelaySession {
  sessionId: string;
  projectId: string;
  status: 'active' | 'ended' | 'disconnected';
  source: 'local' | 'relay';
  startedAt: string;
  endedAt?: string;
}
