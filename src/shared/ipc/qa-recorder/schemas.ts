/**
 * QA Recorder IPC Schemas
 *
 * Zod schemas for scripts, steps, runs, and export operations.
 */

import { z } from 'zod';

// ─── Step Types ────────────────────────────────────────────────

export const QaStepTypeSchema = z.enum([
  'navigate',
  'click',
  'fill',
  'select',
  'press',
  'wait',
  'assert',
]);

export const QaStepNavigateSchema = z.object({
  type: z.literal('navigate'),
  url: z.string(),
});

export const QaStepClickSchema = z.object({
  type: z.literal('click'),
  selector: z.string(),
});

export const QaStepFillSchema = z.object({
  type: z.literal('fill'),
  selector: z.string(),
  value: z.string(),
});

export const QaStepSelectSchema = z.object({
  type: z.literal('select'),
  selector: z.string(),
  value: z.string(),
});

export const QaStepPressSchema = z.object({
  type: z.literal('press'),
  key: z.string(),
});

export const QaStepWaitSchema = z.object({
  type: z.literal('wait'),
  ms: z.number().int().min(0),
});

export const QaStepAssertSchema = z.object({
  type: z.literal('assert'),
  selector: z.string(),
  expected: z.string(),
});

export const QaRecorderStepSchema = z.discriminatedUnion('type', [
  QaStepNavigateSchema,
  QaStepClickSchema,
  QaStepFillSchema,
  QaStepSelectSchema,
  QaStepPressSchema,
  QaStepWaitSchema,
  QaStepAssertSchema,
]);

// ─── Script ───────────────────────────────────────────────────

export const QaScriptSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(QaRecorderStepSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── Run Status ───────────────────────────────────────────────

export const QaRunStatusSchema = z.enum(['running', 'passed', 'failed', 'cancelled']);

// ─── Run ──────────────────────────────────────────────────────

export const QaRunSchema = z.object({
  id: z.string(),
  scriptId: z.string(),
  status: QaRunStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  triggeredBy: z.enum(['manual', 'scheduled', 'ci']),
  outputLines: z.array(z.string()),
  screenshots: z.array(z.string()),
  error: z.string().optional(),
});

// ─── Report ───────────────────────────────────────────────────

export const QaRunReportSchema = z.object({
  runId: z.string(),
  scriptId: z.string(),
  status: QaRunStatusSchema,
  totalSteps: z.number().int(),
  passedSteps: z.number().int(),
  failedSteps: z.number().int(),
  duration: z.number(),
  screenshots: z.array(z.string()),
  outputLines: z.array(z.string()),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});
