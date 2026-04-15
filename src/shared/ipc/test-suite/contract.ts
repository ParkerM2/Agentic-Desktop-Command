/**
 * Test Suite IPC Contract
 *
 * Defines invoke channels for managing scripts, runs, configs, screenshots,
 * browser view, and export operations. Event channels for streaming run output.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { TEST_SUITE, TEST_SUITE_EVENTS } from './channels';
import {
  BrowserViewBoundsSchema,
  BrowserViewCreateInputSchema,
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
  QaScriptSchema,
  TestSuiteConfigSchema,
  TestSuiteScreenshotSchema,
  TestSuiteStepSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const testSuiteInvoke = {
  [TEST_SUITE.LIST.SCRIPTS]: {
    input: z.object({}),
    output: z.array(QaScriptSchema),
  },
  [TEST_SUITE.GET.SCRIPT]: {
    input: z.object({ id: z.string() }),
    output: QaScriptSchema.nullable(),
  },
  [TEST_SUITE.SAVE.SCRIPT]: {
    input: z.object({
      id: z.string().optional(),
      name: z.string(),
      description: z.string().optional(),
      steps: z.array(TestSuiteStepSchema),
    }),
    output: QaScriptSchema,
  },
  [TEST_SUITE.DELETE.SCRIPT]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.RUN.SCRIPT]: {
    input: z.object({
      scriptId: z.string(),
      triggeredBy: z.enum(['manual', 'scheduled', 'ci']).default('manual'),
    }),
    output: z.object({ runId: z.string() }),
  },
  [TEST_SUITE.GET.RUN]: {
    input: z.object({ runId: z.string() }),
    output: QaRunSchema.nullable(),
  },
  [TEST_SUITE.LIST.RUNS]: {
    input: z.object({ scriptId: z.string().optional() }),
    output: z.array(QaRunSchema),
  },
  [TEST_SUITE.EXPORT.FILE]: {
    input: z.object({ runId: z.string(), format: z.enum(['json', 'html', 'csv']) }),
    output: z.object({ filePath: z.string() }),
  },
  [TEST_SUITE.EXPORT.GITHUB]: {
    input: z.object({ runId: z.string(), owner: z.string(), repo: z.string() }),
    output: z.object({ issueUrl: z.string() }),
  },
  [TEST_SUITE.EXPORT['CI-PREVIEW']]: {
    input: z.object({}),
    output: z.object({ yaml: z.string(), filePath: z.string(), exists: z.boolean() }),
  },
  [TEST_SUITE.EXPORT['CI-COMMIT']]: {
    input: z.object({ yaml: z.string() }),
    output: z.object({ filePath: z.string(), committed: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW'].CREATE]: {
    input: BrowserViewCreateInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW'].NAVIGATE]: {
    input: z.object({ url: z.string().url() }),
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW'].BACK]: {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW'].FORWARD]: {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW'].RELOAD]: {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW']['SET-BOUNDS']]: {
    input: BrowserViewBoundsSchema,
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW'].DESTROY]: {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE.CONFIG.GET]: {
    input: z.object({ id: z.string() }),
    output: TestSuiteConfigSchema.nullable(),
  },
  [TEST_SUITE.CONFIG.SAVE]: {
    input: TestSuiteConfigSchema.partial().required({ name: true }),
    output: TestSuiteConfigSchema,
  },
  [TEST_SUITE.CONFIG.LIST]: {
    input: z.object({}),
    output: z.array(TestSuiteConfigSchema),
  },
  [TEST_SUITE.CONFIG.DELETE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.CONFIG['SET-ACTIVE']]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.SCREENSHOT.LIST]: {
    input: z.object({ runId: z.string().optional(), scriptId: z.string().optional() }),
    output: z.array(TestSuiteScreenshotSchema),
  },
  [TEST_SUITE.SCREENSHOT['EXPORT-ZIP']]: {
    input: z.object({ runId: z.string() }),
    output: z.object({ filePath: z.string() }),
  },
  [TEST_SUITE.SCREENSHOT.COPY]: {
    input: z.object({ id: z.string(), destPath: z.string() }),
    output: z.object({ filePath: z.string() }),
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const testSuiteEvents = {
  [TEST_SUITE_EVENTS.OUTPUT.LINE]: {
    payload: z.object({
      runId: z.string(),
      line: z.string(),
      timestamp: z.string(),
    }),
  },
  [TEST_SUITE_EVENTS.RUN.SCREENSHOT]: {
    payload: z.object({
      runId: z.string(),
      screenshotPath: z.string(),
      stepIndex: z.number().int(),
      timestamp: z.string(),
    }),
  },
  [TEST_SUITE_EVENTS.RUN.COMPLETE]: {
    payload: z.object({
      runId: z.string(),
      status: QaRunStatusSchema,
      report: QaRunReportSchema,
    }),
  },
  [TEST_SUITE_EVENTS.RUN.STARTED]: {
    payload: z.object({
      runId: z.string(),
      scriptId: z.string(),
      timestamp: z.string(),
    }),
  },
  [TEST_SUITE_EVENTS.RUN.STEP]: {
    payload: z.object({
      runId: z.string(),
      stepIndex: z.number().int(),
      stepLabel: z.string(),
      timestamp: z.string(),
    }),
  },
  [TEST_SUITE_EVENTS.RUN.COMPLETED]: {
    payload: z.object({
      runId: z.string(),
      status: QaRunStatusSchema,
      report: QaRunReportSchema,
    }),
  },
  [TEST_SUITE_EVENTS.RECORDER.STEP]: {
    payload: z.object({
      stepIndex: z.number().int(),
      step: TestSuiteStepSchema,
      timestamp: z.string(),
    }),
  },
  [TEST_SUITE_EVENTS.RECORDER.STOPPED]: {
    payload: z.object({
      timestamp: z.string(),
    }),
  },
  [TEST_SUITE_EVENTS.CONFIG.CHANGED]: {
    payload: z.object({
      config: TestSuiteConfigSchema,
    }),
  },
} as const;
