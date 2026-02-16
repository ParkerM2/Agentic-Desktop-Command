/**
 * Agent Orchestrator Types
 *
 * Types for the agent lifecycle management system that spawns
 * headless Claude agents for task planning and execution.
 */

// ─── Agent Session ─────────────────────────────────────────────

export type AgentPhase = 'planning' | 'executing' | 'qa';

export type AgentSessionStatus = 'spawning' | 'active' | 'completed' | 'error' | 'killed';

export interface AgentSession {
  id: string;
  taskId: string;
  pid: number;
  status: AgentSessionStatus;
  phase: AgentPhase;
  spawnedAt: string;
  lastHeartbeat: string;
  progressFile: string;
  logFile: string;
  hooksConfigPath: string;
  exitCode: number | null;
  projectPath: string;
  command: string;
}

// ─── Spawn Options ─────────────────────────────────────────────

export interface SpawnOptions {
  taskId: string;
  projectPath: string;
  subProjectPath?: string;
  prompt: string;
  phase: AgentPhase;
  env?: Record<string, string>;
}

// ─── Events ────────────────────────────────────────────────────

export type AgentSessionEventType =
  | 'spawned'
  | 'active'
  | 'completed'
  | 'error'
  | 'killed'
  | 'heartbeat';

export interface AgentSessionEvent {
  type: AgentSessionEventType;
  session: AgentSession;
  timestamp: string;
  exitCode?: number;
  error?: string;
}

// ─── Progress JSONL Entry Types ────────────────────────────────

export interface ProgressToolUseEntry {
  type: 'tool_use';
  tool: string;
  timestamp: string;
}

export interface ProgressPhaseChangeEntry {
  type: 'phase_change';
  phase: string;
  phaseIndex: number;
  totalPhases: number;
  timestamp: string;
}

export interface ProgressPlanReadyEntry {
  type: 'plan_ready';
  planSummary: string;
  planFilePath: string;
  timestamp: string;
}

export interface ProgressAgentStoppedEntry {
  type: 'agent_stopped';
  reason: string;
  timestamp: string;
}

export interface ProgressErrorEntry {
  type: 'error';
  error: string;
  timestamp: string;
}

export interface ProgressHeartbeatEntry {
  type: 'heartbeat';
  timestamp: string;
}

export type ProgressEntry =
  | ProgressToolUseEntry
  | ProgressPhaseChangeEntry
  | ProgressPlanReadyEntry
  | ProgressAgentStoppedEntry
  | ProgressErrorEntry
  | ProgressHeartbeatEntry;

// ─── Orchestrator Interface ────────────────────────────────────

export type AgentSessionEventHandler = (event: AgentSessionEvent) => void;

export interface AgentOrchestrator {
  spawn: (options: SpawnOptions) => Promise<AgentSession>;
  kill: (sessionId: string) => void;
  getSession: (sessionId: string) => AgentSession | undefined;
  getSessionByTaskId: (taskId: string) => AgentSession | undefined;
  listActiveSessions: () => AgentSession[];
  onSessionEvent: (handler: AgentSessionEventHandler) => void;
  dispose: () => void;
}
