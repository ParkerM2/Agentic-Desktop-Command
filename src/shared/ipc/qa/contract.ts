/**
 * QA System IPC Contract
 *
 * Defines invoke channels for starting QA sessions (quiet/full),
 * retrieving reports, and cancelling sessions.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { QaModeSchema, QaReportSchema, QaResultSchema, QaSessionSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const qaInvoke = {
  'qa.startQuiet': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'qa.startFull': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'qa.getReport': {
    input: z.object({ taskId: z.string() }),
    output: QaReportSchema.nullable(),
  },
  'qa.getSession': {
    input: z.object({ taskId: z.string() }),
    output: QaSessionSchema.nullable(),
  },
  'qa.cancel': {
    input: z.object({ sessionId: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const qaEvents = {
  'event:qa.started': {
    payload: z.object({
      taskId: z.string(),
      mode: QaModeSchema,
    }),
  },
  'event:qa.progress': {
    payload: z.object({
      taskId: z.string(),
      step: z.string(),
      total: z.number(),
      current: z.number(),
    }),
  },
  'event:qa.completed': {
    payload: z.object({
      taskId: z.string(),
      result: QaResultSchema,
      issueCount: z.number(),
    }),
  },
} as const;
