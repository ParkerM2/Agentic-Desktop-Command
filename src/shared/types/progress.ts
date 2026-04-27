/**
 * Progress Task Types
 *
 * Shared types for the progress-driven task pipeline. Tasks are stored as
 * directories under `progress/` in the project root and flow through a
 * Research → Plan → Team execution pipeline.
 */

export type ProgressStatus =
  | 'backlog'
  | 'researching'
  | 'research_done'
  | 'planning'
  | 'plan_ready'
  | 'executing'
  | 'review'
  | 'done'
  | 'archived'
  | 'error';

export type ProgressPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ProgressTask {
  id: string;
  slug: string;
  /** Optional scoping to a specific project; null/undefined means unassigned (legacy). */
  projectId?: string;
  rootFile: string;
  title: string;
  description: string;
  status: ProgressStatus;
  priority: ProgressPriority;
  jiraTicket?: string;
  jiraUrl?: string;
  prNumber?: number;
  prUrl?: string;
  prStatus?: string;
  createdAt: string;
  updatedAt: string;

  /** Derived from directory contents */
  hasResearch: boolean;
  hasPlan: boolean;
  hasTeamTasks: boolean;
  teamTaskCount: number;

  /** Content — populated on getTask, not listTasks */
  researchContent?: string;
  planContent?: string;

  /** Workflow template and current phase — set when runWorkflow is called */
  workflow?: string;
  workflowPhase?: string;

  /** Session tracking — persisted to frontmatter on session end */
  lastSessionId?: string;
  lastAgentName?: string;
  completedAt?: string;
  archivedAt?: string;
  teamName?: string;

  /** Lightweight session history — array of past session outcomes */
  sessionHistory?: Array<{
    sessionId: string;
    agentName: string;
    action: string;
    exitCode: number | null;
    timestamp: string;
  }>;
}

export type PrStatus = 'draft' | 'open' | 'merged' | 'closed';

export interface SessionSummary {
  sessionId: string;
  agentName: string;
  agentRole: string;
  taskSlug: string;
  model: string;
  provider: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  toolCallCount: number;
  toolCallsByName: Record<string, number>;
  errorCount: number;
  messageCount: number;
  filesChanged: number;
  status: 'completed' | 'failed' | 'killed';
  exitCode: number | null;
}

export type FilteredLogEntryType =
  | 'assistant_message'
  | 'user_message'
  | 'tool_use'
  | 'tool_result'
  | 'usage'
  | 'error'
  | 'system_init';

export interface FilteredLogEntry {
  type: FilteredLogEntryType;
  timestamp: string;
  sessionId: string;
  data: Record<string, unknown>;
}
