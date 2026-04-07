/**
 * Agent Session Detail Types
 *
 * Types for agent session monitoring in the task pipeline.
 * Covers detailed session views, tool call summaries, and session errors.
 */

import type { AgentStatus } from './agent-dashboard';

export interface AgentSessionDetail {
  sessionId: string;
  name: string;
  role: string;
  taskSlug: string;
  taskNumber: number | null;
  status: AgentStatus;
  branch: string | null;
  model: string;
  tokenUsage: { input: number; output: number };
  startedAt: string;
  lastActivityAt: string;
  exitCode: number | null;
  isTeamLead: boolean;
}

export interface ToolCallSummary {
  id: string;
  toolName: string;
  inputSummary: string;
  success: boolean;
  timestamp: string;
}

export interface AgentError {
  message: string;
  stack?: string;
  timestamp: string;
  sessionId: string;
}
