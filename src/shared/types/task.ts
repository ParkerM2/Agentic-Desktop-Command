/**
 * Task-related types
 */

import type { TaskPriority, TaskStatus } from './hub/enums';

export type { TaskPriority, TaskStatus } from './hub/enums';

/**
 * Maps legacy on-disk status values to unified Hub status values.
 * Used when reading old spec files that may contain pre-unification statuses.
 */
export const LEGACY_STATUS_MAP: Record<string, TaskStatus> = {
  queue: 'queued',
  in_progress: 'running',
  ai_review: 'review',
  human_review: 'review',
  pr_created: 'done',
};

export type SubtaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type ReviewReason = 'completed' | 'errors' | 'qa_rejected' | 'plan_review';

export type ExecutionPhase =
  | 'idle'
  | 'planning'
  | 'coding'
  | 'testing'
  | 'reviewing'
  | 'complete'
  | 'error';

export interface ExecutionProgress {
  phase: ExecutionPhase;
  phaseProgress: number;
  overallProgress: number;
  currentSubtask?: string;
  message?: string;
  startedAt?: string;
  sequenceNumber?: number;
  completedPhases?: ExecutionPhase[];
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: SubtaskStatus;
  files: string[];
}

export interface QAReport {
  status: 'passed' | 'failed' | 'pending';
  issues: QAIssue[];
  timestamp: string;
}

export interface QAIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  file?: string;
  line?: number;
}

export interface PRStatusInfo {
  prNumber: number;
  state: 'open' | 'closed' | 'merged';
  reviewDecision: 'approved' | 'changes_requested' | 'review_required' | null;
  ciStatus: 'passing' | 'failing' | 'pending' | 'none';
  isDraft: boolean;
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  lastUpdated: string;
}

export interface ImageAttachment {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
}

export interface ImplementationPlan {
  phases: ImplementationPhase[];
  estimatedDuration?: string;
}

export interface ImplementationPhase {
  name: string;
  description: string;
  subtasks: Subtask[];
}

export interface TaskMetadata {
  specId?: string;
  worktreePath?: string;
  branch?: string;
  prUrl?: string;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  specId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  workspaceId?: string;
  subtasks: Subtask[];
  executionProgress?: ExecutionProgress;
  qaReport?: QAReport;
  reviewReason?: ReviewReason;
  prStatus?: PRStatusInfo;
  metadata?: TaskMetadata;
  logs?: string[];
  images?: ImageAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  projectId: string;
  complexity?: 'simple' | 'standard' | 'complex';
}

export type TaskOrderState = Record<TaskStatus, string[]>;

// ── Smart Task Creation Types ─────────────────────────────────

/** Effort estimate for a suggested subtask. */
export type EstimatedEffort = 'small' | 'medium' | 'large';

/** Priority suggestion for a decomposed subtask. */
export type SuggestedPriority = 'low' | 'medium' | 'high';

/** A suggested subtask from LLM task decomposition. */
export interface TaskSuggestion {
  title: string;
  description: string;
  estimatedEffort: EstimatedEffort;
  suggestedPriority: SuggestedPriority;
}

/** Result of decomposing a task description into subtasks. */
export interface TaskDecompositionResult {
  originalDescription: string;
  suggestions: TaskSuggestion[];
}

/** Import data extracted from a GitHub issue. */
export interface GithubIssueImport {
  issueNumber: number;
  issueUrl: string;
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
}
