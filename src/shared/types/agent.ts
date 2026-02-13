/**
 * Agent-related types
 */

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

/**
 * Token usage tracking for an agent session.
 * Accumulated from parsing Claude CLI output.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  lastUpdated: string;
}

export interface AgentSession {
  id: string;
  taskId: string;
  projectId: string;
  status: AgentStatus;
  worktreePath?: string;
  terminalId?: string;
  startedAt: string;
  completedAt?: string;
  tokenUsage?: TokenUsage;
}

/**
 * Aggregated token usage across all agents.
 */
export interface AggregatedTokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  byAgent: Array<{
    agentId: string;
    taskId: string;
    projectId: string;
    usage: TokenUsage;
  }>;
}

export interface AgentEvent {
  agentId: string;
  type: 'status_change' | 'progress' | 'log' | 'error' | 'phase_change';
  data: Record<string, unknown>;
  timestamp: string;
}
