/**
 * Agent Connection Strategy — Strategy pattern for agent connection methods
 *
 * Abstracts the transport layer between ADC and headless Claude processes.
 * Implementations: SubprocessStrategy (current), UdsInboxStrategy (future),
 * McpChannelStrategy (research preview).
 */

// ── Strategy Types ──────────────────────────────────────────

/** Configuration for spawning an agent via a connection strategy */
export interface AgentSpawnConfig {
  /** Working directory for the agent process */
  cwd: string;
  /** Initial prompt to send after spawn */
  prompt: string;
  /** Claude model to use */
  model?: string;
  /** Optional session name */
  name?: string;
}

/** Connection-level status for an agent session */
export type AgentConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error';

/** Result of a successful spawn — maps to process-level identifiers */
export interface AgentSpawnResult {
  /** Process ID or equivalent connection identifier */
  pid: number;
  /** Whether the connection is alive */
  alive: boolean;
  /** Callback to write data to the agent's stdin/input channel */
  write: (data: string) => boolean;
  /** Callback to terminate the agent */
  kill: () => void;
  /** Callback to check liveness */
  isAlive: () => boolean;
  /** Event registration for stdout data */
  onStdout: (handler: (data: Buffer) => void) => () => void;
  /** Event registration for stderr data */
  onStderr: (handler: (data: string) => void) => () => void;
  /** Event registration for process exit */
  onExit: (handler: (code: number | null, signal: string | null) => void) => () => void;
  /** Event registration for process errors */
  onError: (handler: (error: Error) => void) => () => void;
}

// ── Strategy Interface ──────────────────────────────────────

/**
 * Strategy for connecting to and communicating with agent processes.
 *
 * Each implementation handles a different transport mechanism:
 * - SubprocessStrategy: child_process.spawn with stream-json (current)
 * - UdsInboxStrategy: Unix domain socket (future KAIROS GA)
 * - McpChannelStrategy: --channels flag (research preview)
 */
export interface AgentConnectionStrategy {
  /** Spawn a new agent connection, returning process-level handles */
  spawn: (config: AgentSpawnConfig) => AgentSpawnResult;
  /** Send a message to an active agent session */
  sendMessage: (pid: number, message: string) => boolean;
  /** Terminate an agent session */
  terminate: (pid: number) => void;
  /** Get the connection status for a session */
  getStatus: (pid: number) => AgentConnectionStatus;
}
