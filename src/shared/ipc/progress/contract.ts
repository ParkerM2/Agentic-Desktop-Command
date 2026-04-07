/**
 * Progress IPC Contract
 *
 * Invoke and event channel definitions for the progress-driven task pipeline.
 * Covers task CRUD, pipeline actions (research, plan, team spin-up),
 * workflow orchestration, and real-time progress events.
 */

import { z } from 'zod';

import {
  progressActionCompletedPayloadSchema,
  progressActionFailedPayloadSchema,
  progressActionStartedPayloadSchema,
  progressCreateTaskInputSchema,
  progressGetTaskInputSchema,
  progressRunWorkflowOutputSchema,
  progressSessionOutputSchema,
  progressSlugInputSchema,
  progressSpinUpTeamOutputSchema,
  progressSuccessOutputSchema,
  progressTaskArchivedPayloadSchema,
  progressTaskCreatedPayloadSchema,
  progressTaskSchema,
  progressTaskUpdatedPayloadSchema,
  progressUpdateTaskInputSchema,
  progressWorkflowStepPayloadSchema,
} from './schemas';

// ── Invoke Channels ─────────────────────────────────────────────

export const progressInvoke = {
  'progress.listTasks': {
    input: z.object({}),
    output: z.array(progressTaskSchema),
  },
  'progress.getTask': {
    input: progressGetTaskInputSchema,
    output: progressTaskSchema.nullable(),
  },
  'progress.createTask': {
    input: progressCreateTaskInputSchema,
    output: progressTaskSchema,
  },
  'progress.updateTask': {
    input: progressUpdateTaskInputSchema,
    output: progressTaskSchema,
  },
  'progress.archiveTask': {
    input: progressSlugInputSchema,
    output: progressSuccessOutputSchema,
  },
  'progress.deleteTask': {
    input: progressSlugInputSchema,
    output: progressSuccessOutputSchema,
  },
  'progress.listArchived': {
    input: z.object({}),
    output: z.array(progressTaskSchema),
  },
  'progress.startResearch': {
    input: progressSlugInputSchema,
    output: progressSessionOutputSchema,
  },
  'progress.createPlan': {
    input: progressSlugInputSchema,
    output: progressSessionOutputSchema,
  },
  'progress.spinUpTeam': {
    input: progressSlugInputSchema,
    output: progressSpinUpTeamOutputSchema,
  },
  'progress.runWorkflow': {
    input: progressSlugInputSchema,
    output: progressRunWorkflowOutputSchema,
  },
  'progress.cancelAction': {
    input: progressSlugInputSchema,
    output: progressSuccessOutputSchema,
  },
} as const;

// ── Event Channels ──────────────────────────────────────────────

export const progressEvents = {
  'event:progress.taskUpdated': {
    payload: progressTaskUpdatedPayloadSchema,
  },
  'event:progress.taskCreated': {
    payload: progressTaskCreatedPayloadSchema,
  },
  'event:progress.taskArchived': {
    payload: progressTaskArchivedPayloadSchema,
  },
  'event:progress.actionStarted': {
    payload: progressActionStartedPayloadSchema,
  },
  'event:progress.actionCompleted': {
    payload: progressActionCompletedPayloadSchema,
  },
  'event:progress.actionFailed': {
    payload: progressActionFailedPayloadSchema,
  },
  'event:progress.workflowStep': {
    payload: progressWorkflowStepPayloadSchema,
  },
} as const;
