/**
 * Tasks IPC Schemas
 *
 * Zod schemas for task-related IPC channels including task CRUD,
 * execution progress, smart task creation (decomposition), Hub tasks,
 * and GitHub issue imports.
 */

import { z } from 'zod';

// ── Local Task Schemas ──────────────────────────────────────────

export const TaskStatusSchema = z.enum([
  'backlog',
  'planning',
  'plan_ready',
  'queued',
  'running',
  'paused',
  'review',
  'done',
  'error',
]);

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  files: z.array(z.string()),
});

export const ExecutionPhaseSchema = z.enum([
  'idle',
  'planning',
  'coding',
  'testing',
  'reviewing',
  'complete',
  'error',
]);

export const ExecutionProgressSchema = z.object({
  phase: ExecutionPhaseSchema,
  phaseProgress: z.number(),
  overallProgress: z.number(),
  currentSubtask: z.string().optional(),
  message: z.string().optional(),
  startedAt: z.string().optional(),
  sequenceNumber: z.number().optional(),
  completedPhases: z.array(ExecutionPhaseSchema).optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  specId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  projectId: z.string().optional(),
  workspaceId: z.string().optional(),
  subtasks: z.array(SubtaskSchema),
  executionProgress: ExecutionProgressSchema.optional(),
  reviewReason: z.enum(['completed', 'errors', 'qa_rejected', 'plan_review']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  logs: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TaskDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  projectId: z.string(),
  complexity: z.enum(['simple', 'standard', 'complex']).optional(),
});

// ── Smart Task Creation Schemas ─────────────────────────────────

export const EstimatedEffortSchema = z.enum(['small', 'medium', 'large']);
export const SuggestedPrioritySchema = z.enum(['low', 'medium', 'high']);

export const TaskSuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  estimatedEffort: EstimatedEffortSchema,
  suggestedPriority: SuggestedPrioritySchema,
});

export const TaskDecompositionResultSchema = z.object({
  originalDescription: z.string(),
  suggestions: z.array(TaskSuggestionSchema),
});

export const GithubIssueImportSchema = z.object({
  issueNumber: z.number(),
  issueUrl: z.string(),
  title: z.string(),
  body: z.string(),
  labels: z.array(z.string()),
  assignees: z.array(z.string()),
});

// ── Hub Task Schemas (Hub API shape — distinct from local TaskSchema) ──

export const HubTaskStatusSchema = z.enum([
  'backlog',
  'planning',
  'plan_ready',
  'queued',
  'running',
  'paused',
  'review',
  'done',
  'error',
]);

export const HubTaskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const HubTaskProgressSchema = z
  .object({
    phase: z.string(),
    phaseIndex: z.number(),
    totalPhases: z.number(),
    currentAgent: z.string().nullable(),
    filesChanged: z.number(),
    lastActivity: z.string(),
    logs: z.array(z.string()),
  })
  .optional();

export const HubTaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  workspaceId: z.string().optional(),
  subProjectId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  status: HubTaskStatusSchema,
  priority: HubTaskPrioritySchema,
  assignedDeviceId: z.string().optional(),
  createdByDeviceId: z.string().optional(),
  executionSessionId: z.string().optional(),
  progress: HubTaskProgressSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  subtasks: z.array(z.unknown()).optional(),
  agentName: z.string().optional(),
  activityHistory: z.array(z.unknown()).optional(),
  costTokens: z.number().optional(),
  costUsd: z.number().optional(),
  prNumber: z.number().optional(),
  prState: z.string().optional(),
  prCiStatus: z.string().optional(),
  prUrl: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
