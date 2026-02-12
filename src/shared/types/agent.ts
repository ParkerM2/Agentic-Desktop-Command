/**
 * Agent-related types
 */

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

export interface AgentSession {
  id: string;
  taskId: string;
  projectId: string;
  status: AgentStatus;
  worktreePath?: string;
  terminalId?: string;
  startedAt: string;
  completedAt?: string;
}

export interface AgentEvent {
  agentId: string;
  type: 'status_change' | 'progress' | 'log' | 'error' | 'phase_change';
  data: Record<string, unknown>;
  timestamp: string;
}
