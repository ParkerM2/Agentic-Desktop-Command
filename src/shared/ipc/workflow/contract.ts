/**
 * Workflow IPC Contract
 *
 * Defines invoke channels for workflow progress watching,
 * task launching, and session management.
 * Also defines push event channels for milestone, context, and permission events.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

// ─── Event Channels ───────────────────────────────────────────

export const workflowEvents = {
  'event:workflow.milestone': {
    payload: z.object({
      ticket: z.string(),
      run: z.string().nullable(),
      event: z.string(),
      agent: z.string().nullable(),
      ts: z.string(),
      data: z.record(z.string(), z.unknown()),
    }),
  },
  'event:workflow.context': {
    payload: z.object({
      ticket: z.string().nullable(),
      phase: z.enum(['research', 'plan', 'agent-team']).nullable(),
      runSlug: z.string().nullable(),
    }),
  },
  'event:workflow.permission': {
    payload: z.object({
      ticket: z.string(),
      agent: z.string(),
      message: z.string(),
    }),
  },
} as const;

// ─── Invoke Channels ──────────────────────────────────────────

export const workflowInvoke = {
  'workflow.watchProgress': {
    input: z.object({ projectPath: z.string() }),
    output: SuccessResponseSchema,
  },
  'workflow.stopWatching': {
    input: z.object({ projectPath: z.string() }),
    output: SuccessResponseSchema,
  },
  'workflow.launch': {
    input: z.object({
      taskDescription: z.string(),
      projectPath: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), pid: z.number() }),
  },
  'workflow.isRunning': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ running: z.boolean() }),
  },
  'workflow.stop': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ stopped: z.boolean() }),
  },
} as const;
