/**
 * Progress IPC Schemas
 *
 * Zod schemas for the progress domain IPC channels. Covers task CRUD,
 * pipeline actions (research, plan, team), and workflow orchestration.
 */

import { z } from 'zod';

// ── Core Enums ──────────────────────────────────────────────────

export const progressStatusSchema = z.enum([
  'backlog',
  'researching',
  'research_done',
  'planning',
  'plan_ready',
  'executing',
  'review',
  'done',
  'archived',
  'error',
]);

export const progressPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const progressActionSchema = z.enum(['research', 'plan', 'team']);

export const workflowStepStatusSchema = z.enum(['started', 'completed', 'failed']);

// ── Core Task Schema ────────────────────────────────────────────

export const progressTaskSchema = z.object({
  slug: z.string(),
  rootFile: z.string(),
  title: z.string(),
  description: z.string(),
  status: progressStatusSchema,
  priority: progressPrioritySchema,
  jiraTicket: z.string().optional(),
  jiraUrl: z.string().optional(),
  prNumber: z.number().optional(),
  prUrl: z.string().optional(),
  prStatus: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  hasResearch: z.boolean(),
  hasPlan: z.boolean(),
  hasTeamTasks: z.boolean(),
  teamTaskCount: z.number(),
  researchContent: z.string().optional(),
  planContent: z.string().optional(),
  workflow: z.string().optional(),
  workflowPhase: z.string().optional(),
  lastSessionId: z.string().optional(),
  lastAgentName: z.string().optional(),
  completedAt: z.string().optional(),
  archivedAt: z.string().optional(),
  teamName: z.string().optional(),
  sessionHistory: z
    .array(
      z.object({
        sessionId: z.string(),
        agentName: z.string(),
        action: z.string(),
        exitCode: z.number().nullable(),
        timestamp: z.string(),
      }),
    )
    .optional(),
});

// ── Invoke Input Schemas ────────────────────────────────────────

export const progressGetTaskInputSchema = z.object({
  slug: z.string(),
});

export const progressCreateTaskInputSchema = z.object({
  slug: z.string(),
  title: z.string().min(1),
  description: z.string(),
  priority: progressPrioritySchema.optional(),
});

export const progressUpdateTaskInputSchema = z.object({
  slug: z.string(),
  updates: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: progressStatusSchema.optional(),
    priority: progressPrioritySchema.optional(),
    jiraTicket: z.string().optional(),
    jiraUrl: z.string().optional(),
    prNumber: z.number().optional(),
    prUrl: z.string().optional(),
    prStatus: z.string().optional(),
    workflow: z.string().optional(),
    workflowPhase: z.string().optional(),
    lastSessionId: z.string().optional(),
    lastAgentName: z.string().optional(),
    completedAt: z.string().optional(),
    archivedAt: z.string().optional(),
    teamName: z.string().optional(),
  }),
});

export const progressSlugInputSchema = z.object({
  slug: z.string(),
});

export const progressActionInputSchema = z.object({
  slug: z.string(),
  prompt: z.string().optional(),
});

export const progressRunWorkflowInputSchema = z.object({
  slug: z.string(),
  templateId: z.string().optional(),
});

// ── Invoke Output Schemas ───────────────────────────────────────

export const progressLogCleanupOutputSchema = z.object({
  deletedFiles: z.number(),
});

export const progressSuccessOutputSchema = z.object({
  success: z.boolean(),
});

export const progressSessionOutputSchema = z.object({
  sessionId: z.string(),
});

export const progressSpinUpTeamOutputSchema = z.object({
  sessionId: z.string(),
  teamLeadIndex: z.number(),
  action: z.string(),
});

export const progressRunWorkflowOutputSchema = z.object({
  started: z.literal(true),
});

// ── Event Payload Schemas ───────────────────────────────────────

export const progressTaskUpdatedPayloadSchema = z.object({
  slug: z.string(),
  task: progressTaskSchema,
});

export const progressTaskCreatedPayloadSchema = z.object({
  slug: z.string(),
  task: progressTaskSchema,
});

export const progressTaskArchivedPayloadSchema = z.object({
  slug: z.string(),
});

export const progressActionStartedPayloadSchema = z.object({
  slug: z.string(),
  action: progressActionSchema,
  sessionId: z.string(),
});

export const progressActionCompletedPayloadSchema = z.object({
  slug: z.string(),
  action: progressActionSchema,
});

export const progressActionFailedPayloadSchema = z.object({
  slug: z.string(),
  action: progressActionSchema,
  error: z.string(),
});

export const progressWorkflowStepPayloadSchema = z.object({
  slug: z.string(),
  step: progressActionSchema,
  status: workflowStepStatusSchema,
});

// ── Session Summary Schema ─────────────────────────────────────

export const sessionSummarySchema = z.object({
  sessionId: z.string(),
  agentName: z.string(),
  agentRole: z.string(),
  taskSlug: z.string(),
  model: z.string(),
  provider: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  costUsd: z.number(),
  toolCallCount: z.number(),
  toolCallsByName: z.record(z.string(), z.number()),
  errorCount: z.number(),
  messageCount: z.number(),
  filesChanged: z.number(),
  status: z.enum(['completed', 'failed', 'killed']),
  exitCode: z.number().nullable(),
});
