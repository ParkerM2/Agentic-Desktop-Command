/**
 * QA System IPC Contract
 *
 * Defines invoke channels for starting QA sessions (quiet/full),
 * retrieving reports, and cancelling sessions.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { QA, QA_EVENTS } from './channels';
import { QaModeSchema, QaReportSchema, QaResultSchema, QaSessionSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const qaInvoke = {
  [QA.START.QUIET]: {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  [QA.START.FULL]: {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  [QA.GET.REPORT]: {
    input: z.object({ taskId: z.string() }),
    output: QaReportSchema.nullable(),
  },
  [QA.GET.SESSION]: {
    input: z.object({ taskId: z.string() }),
    output: QaSessionSchema.nullable(),
  },
  [QA.CANCEL.SESSION]: {
    input: z.object({ sessionId: z.string() }),
    output: SuccessResponseSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const qaEvents = {
  [QA_EVENTS.SESSION.STARTED]: {
    payload: z.object({
      taskId: z.string(),
      mode: QaModeSchema,
    }),
  },
  [QA_EVENTS.SESSION.PROGRESS]: {
    payload: z.object({
      taskId: z.string(),
      step: z.string(),
      total: z.number(),
      current: z.number(),
    }),
  },
  [QA_EVENTS.SESSION.COMPLETED]: {
    payload: z.object({
      taskId: z.string(),
      result: QaResultSchema,
      issueCount: z.number(),
    }),
  },
} as const;
