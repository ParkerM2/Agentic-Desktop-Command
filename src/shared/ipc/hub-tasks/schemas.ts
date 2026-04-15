/**
 * Tasks IPC Schemas
 *
 * Zod schemas for task-related IPC channels including Hub tasks
 * and task event payloads (status changes, progress, logs).
 *
 * Local task CRUD schemas removed — no remaining handlers.
 */

import { z } from 'zod';

// ── Shared Schemas (used by events) ────────────────────────────

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

// ── Hub Task Schemas (Hub API shape) ───────────────────────────

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
