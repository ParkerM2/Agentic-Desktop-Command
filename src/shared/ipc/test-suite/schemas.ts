/**
 * Test Suite IPC Schemas
 *
 * Zod schemas for scripts, steps, runs, configs, screenshots, and export operations.
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

export const StepContextSchema = z.object({
  text: z.string().optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  tagName: z.string(),
  inputType: z.string().optional(),
});

export const QaStepClickSchema = z.object({
  type: z.literal('click'),
  selector: z.string(),
  context: StepContextSchema.optional(),
});

export const QaStepFillSchema = z.object({
  type: z.literal('fill'),
  selector: z.string(),
  value: z.string(),
  context: StepContextSchema.optional(),
});

export const QaStepSelectSchema = z.object({
  type: z.literal('select'),
  selector: z.string(),
  value: z.string(),
  context: StepContextSchema.optional(),
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

export const TestSuiteStepSchema = z.discriminatedUnion('type', [
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
  description: z.string().nullable(),
  steps: z.array(TestSuiteStepSchema),
  tags: z.array(z.string()).default([]),
  filePath: z.string(),
  projectId: z.string(),
  targetUrl: z.string(),
  stepCount: z.number().int(),
  lastStatus: z.string().nullable(),
  lastRunAt: z.string().nullable(),
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
  stepsPassed: z.number().int().default(0),
  stepsFailed: z.number().int().default(0),
  durationMs: z.number().int().default(0),
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

// ─── Config ───────────────────────────────────────────────────

export const TestSuiteConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetUrl: z.url(),
  viewportWidth: z.number().int().positive(),
  viewportHeight: z.number().int().positive(),
  screenshotMode: z.enum(['smart', 'per-click', 'per-nav', 'per-form', 'per-assertion', 'manual']),
  testDirectory: z.string(),
  saveScreenshotsToTemp: z.boolean(),
  navigationTimeout: z.number().int().min(1000).default(30000),
  actionTimeout: z.number().int().min(1000).default(10000),
  browsers: z.array(z.enum(['chromium', 'firefox', 'webkit'])).default(['chromium']),
  workers: z.number().int().min(1).max(16).default(1),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TestSuiteConfig = z.infer<typeof TestSuiteConfigSchema>;

// ─── Screenshot ───────────────────────────────────────────────

export const TestSuiteScreenshotSchema = z.object({
  id: z.string(),
  runId: z.string(),
  scriptId: z.string(),
  stepIndex: z.number().int(),
  stepLabel: z.string(),
  trigger: z.enum(['nav', 'click', 'fill', 'assert', 'manual']),
  filePath: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  capturedAt: z.string(),
});
export type TestSuiteScreenshot = z.infer<typeof TestSuiteScreenshotSchema>;

// ─── Browser View ─────────────────────────────────────────────

export const BrowserViewBoundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export const BrowserViewCreateInputSchema = z.object({
  url: z.url(),
  bounds: BrowserViewBoundsSchema,
});
