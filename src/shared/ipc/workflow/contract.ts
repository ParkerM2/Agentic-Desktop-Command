/**
 * Workflow IPC Contract
 *
 * Defines invoke channels for workflow progress watching,
 * task launching, and session management.
 * Also defines push event channels for milestone, context, and permission events.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { WORKFLOW, WORKFLOW_EVENTS } from './channels';

// ─── Event Channels ───────────────────────────────────────────

export const workflowEvents = {
  [WORKFLOW_EVENTS.WORKFLOW.MILESTONE]: {
    payload: z.object({
      ticket: z.string(),
      run: z.string().nullable(),
      event: z.string(),
      agent: z.string().nullable(),
      ts: z.string(),
      data: z.record(z.string(), z.unknown()),
    }),
  },
  [WORKFLOW_EVENTS.WORKFLOW.CONTEXT]: {
    payload: z.object({
      ticket: z.string().nullable(),
      phase: z.enum(['research', 'plan', 'agent-team']).nullable(),
      runSlug: z.string().nullable(),
    }),
  },
  [WORKFLOW_EVENTS.WORKFLOW.PERMISSION]: {
    payload: z.object({
      ticket: z.string(),
      agent: z.string(),
      message: z.string(),
    }),
  },
} as const;

// ─── Invoke Channels ──────────────────────────────────────────

export const workflowInvoke = {
  [WORKFLOW.WATCH.PROGRESS]: {
    input: z.object({ projectPath: z.string() }),
    output: SuccessResponseSchema,
  },
  [WORKFLOW.STOP.WATCHING]: {
    input: z.object({ projectPath: z.string() }),
    output: SuccessResponseSchema,
  },
  [WORKFLOW.LAUNCH.WORKFLOW]: {
    input: z.object({
      taskDescription: z.string(),
      projectPath: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), pid: z.number() }),
  },
  [WORKFLOW.CHECK.RUNNING]: {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ running: z.boolean() }),
  },
  [WORKFLOW.STOP.RUNNING]: {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ stopped: z.boolean() }),
  },
} as const;
