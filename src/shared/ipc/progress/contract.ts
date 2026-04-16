/**
 * Progress IPC Contract
 *
 * Invoke and event channel definitions for the progress-driven task pipeline.
 * Covers task CRUD, pipeline actions (research, plan, team spin-up),
 * workflow orchestration, and real-time progress events.
 */

import { z } from 'zod';

import { PROGRESS, PROGRESS_EVENTS } from './channels';
import {
  progressActionCompletedPayloadSchema,
  progressActionFailedPayloadSchema,
  progressActionInputSchema,
  progressActionStartedPayloadSchema,
  progressCreateTaskInputSchema,
  progressGetTaskInputSchema,
  progressLogCleanupOutputSchema,
  progressRunWorkflowInputSchema,
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
  [PROGRESS.LIST.TASKS]: {
    input: z.object({ projectId: z.string().optional() }),
    output: z.array(progressTaskSchema),
  },
  [PROGRESS.GET.TASK]: {
    input: progressGetTaskInputSchema,
    output: progressTaskSchema.nullable(),
  },
  [PROGRESS.CREATE.TASK]: {
    input: progressCreateTaskInputSchema,
    output: progressTaskSchema,
  },
  [PROGRESS.UPDATE.TASK]: {
    input: progressUpdateTaskInputSchema,
    output: progressTaskSchema,
  },
  [PROGRESS.ARCHIVE.TASK]: {
    input: progressSlugInputSchema,
    output: progressSuccessOutputSchema,
  },
  [PROGRESS.DELETE.TASK]: {
    input: progressSlugInputSchema,
    output: progressSuccessOutputSchema,
  },
  [PROGRESS.LIST.ARCHIVED]: {
    input: z.object({}),
    output: z.array(progressTaskSchema),
  },
  [PROGRESS.START.RESEARCH]: {
    input: progressActionInputSchema,
    output: progressSessionOutputSchema,
  },
  [PROGRESS.CREATE.PLAN]: {
    input: progressActionInputSchema,
    output: progressSessionOutputSchema,
  },
  [PROGRESS.START.TEAM]: {
    input: progressActionInputSchema,
    output: progressSpinUpTeamOutputSchema,
  },
  [PROGRESS.START.WORKFLOW]: {
    input: progressRunWorkflowInputSchema,
    output: progressRunWorkflowOutputSchema,
  },
  [PROGRESS.CANCEL.ACTION]: {
    input: progressSlugInputSchema,
    output: progressSuccessOutputSchema,
  },
  [PROGRESS.RUN['LOG-CLEANUP']]: {
    input: z.object({}),
    output: progressLogCleanupOutputSchema,
  },
} as const;

// ── Event Channels ──────────────────────────────────────────────

export const progressEvents = {
  [PROGRESS_EVENTS.TASK.UPDATED]: {
    payload: progressTaskUpdatedPayloadSchema,
  },
  [PROGRESS_EVENTS.TASK.CREATED]: {
    payload: progressTaskCreatedPayloadSchema,
  },
  [PROGRESS_EVENTS.TASK.ARCHIVED]: {
    payload: progressTaskArchivedPayloadSchema,
  },
  [PROGRESS_EVENTS.ACTION.STARTED]: {
    payload: progressActionStartedPayloadSchema,
  },
  [PROGRESS_EVENTS.ACTION.COMPLETED]: {
    payload: progressActionCompletedPayloadSchema,
  },
  [PROGRESS_EVENTS.ACTION.FAILED]: {
    payload: progressActionFailedPayloadSchema,
  },
  [PROGRESS_EVENTS.WORKFLOW.STEP]: {
    payload: progressWorkflowStepPayloadSchema,
  },
} as const;
