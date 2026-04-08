/**
 * Session Config Types
 *
 * Types for the universal session lifecycle system.
 * Every Claude session that works on a progress task is tracked
 * in progress/<slug>/session.config.json as an append-only array.
 */

// ─── Spawn Config ─────────────────────────────────────────────

/** Everything needed to restart a session with identical configuration */
export interface SessionSpawnConfig {
  prompt: string;
  projectPath: string;
  projectId?: string;
  subProjectPath?: string;
  taskSlug: string;
  phase: string;
  env?: Record<string, string>;
  isRemote: boolean;
  hostDeviceId?: string;
}

// ─── Token Usage ──────────────────────────────────────────────

export interface SessionTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

// ─── Tool Usage ───────────────────────────────────────────────

export interface SessionToolUsage {
  tool: string;
  count: number;
}

// ─── Session Status ───────────────────────────────────────────

export type SessionLifecycleStatus = 'active' | 'completed' | 'error' | 'killed';

// ─── Session Phase ────────────────────────────────────────────

export type SessionPhase =
  | 'research'
  | 'planning'
  | 'executing'
  | 'qa'
  | 'team-lead'
  | 'workspace'
  | 'assistant';

// ─── Session Record ───────────────────────────────────────────

/** A single session's lifecycle record, stored in session.config.json */
export interface SessionRecord {
  /** Unique session ID from AgentManagerService or RelayService */
  sessionId: string;

  /** Descriptive agent name: "{role}-{slug}" */
  agentName: string;

  /** What this session is doing */
  phase: SessionPhase;

  /** Current lifecycle state */
  status: SessionLifecycleStatus;

  /** Everything needed to restart this exact session */
  spawnConfig: SessionSpawnConfig;

  /** Model used by this session (set by harness from CLI args) */
  model?: string;

  /** Token usage (updated by JsonlProgressWatcher from session output) */
  tokenUsage?: SessionTokenUsage;

  /** Tool usage summary (updated by JsonlProgressWatcher) */
  toolUsage?: SessionToolUsage[];

  /** ISO timestamp when session was spawned */
  startedAt: string;

  /** ISO timestamp when session ended */
  endedAt?: string;

  /** Process exit code */
  exitCode?: number;

  /** Error message if session failed */
  error?: string;

  /** Wave number for team execution phases */
  wave?: number;

  /** Task index within a wave for team execution */
  taskIndex?: number;
}
