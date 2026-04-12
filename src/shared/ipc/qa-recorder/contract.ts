/**
 * QA Recorder IPC Contract
 *
 * Defines invoke channels for managing scripts and runs,
 * and event channels for streaming run output and screenshots.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { QA_RECORDER, QA_RECORDER_EVENTS } from './channels';
import {
  QaRecorderStepSchema,
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
  QaScriptSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const qaRecorderInvoke = {
  [QA_RECORDER.LIST.SCRIPTS]: {
    input: z.object({}),
    output: z.array(QaScriptSchema),
  },
  [QA_RECORDER.GET.SCRIPT]: {
    input: z.object({ id: z.string() }),
    output: QaScriptSchema.nullable(),
  },
  [QA_RECORDER.SAVE.SCRIPT]: {
    input: z.object({
      id: z.string().optional(),
      name: z.string(),
      description: z.string().optional(),
      steps: z.array(QaRecorderStepSchema),
    }),
    output: QaScriptSchema,
  },
  [QA_RECORDER.DELETE.SCRIPT]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [QA_RECORDER.RUN.SCRIPT]: {
    input: z.object({
      scriptId: z.string(),
      triggeredBy: z.enum(['manual', 'scheduled', 'ci']).default('manual'),
    }),
    output: z.object({ runId: z.string() }),
  },
  [QA_RECORDER.GET.RUN]: {
    input: z.object({ runId: z.string() }),
    output: QaRunSchema.nullable(),
  },
  [QA_RECORDER.LIST.RUNS]: {
    input: z.object({ scriptId: z.string().optional() }),
    output: z.array(QaRunSchema),
  },
  [QA_RECORDER.EXPORT.FILE]: {
    input: z.object({ runId: z.string(), format: z.enum(['json', 'html', 'csv']) }),
    output: z.object({ filePath: z.string() }),
  },
  [QA_RECORDER.EXPORT.GITHUB]: {
    input: z.object({ runId: z.string(), owner: z.string(), repo: z.string() }),
    output: z.object({ issueUrl: z.string() }),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const qaRecorderEvents = {
  [QA_RECORDER_EVENTS.OUTPUT.LINE]: {
    payload: z.object({
      runId: z.string(),
      line: z.string(),
      timestamp: z.string(),
    }),
  },
  [QA_RECORDER_EVENTS.RUN.SCREENSHOT]: {
    payload: z.object({
      runId: z.string(),
      screenshotPath: z.string(),
      stepIndex: z.number().int(),
      timestamp: z.string(),
    }),
  },
  [QA_RECORDER_EVENTS.RUN.COMPLETE]: {
    payload: z.object({
      runId: z.string(),
      status: QaRunStatusSchema,
      report: QaRunReportSchema,
    }),
  },
} as const;
