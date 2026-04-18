/**
 * Test Suite IPC Contract
 *
 * Defines invoke channels for managing scripts, runs, configs, screenshots,
 * browser view, and export operations. Event channels for streaming run output.
 */

import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import {
  AnalyticsSummarySchema,
  ErrorPatternSchema,
  FlakyTestSchema,
  RunHistoryEntrySchema,
  SlowestTestSchema,
  TopFailureSchema,
  TrendPointSchema,
} from './analytics-schemas';
import {
  BaselineRecordSchema,
  DiffResultSchema,
  DiffSensitivitySchema,
} from './baseline-schemas';
import { TEST_SUITE, TEST_SUITE_EVENTS } from './channels';
import {
  DataRowSchema,
  ScheduleRecordSchema,
  SharedStepGroupSchema,
} from './power-schemas';
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
    input: z.object({ projectId: z.string() }),
    output: z.array(QaScriptSchema),
  },
  [TEST_SUITE.GET.SCRIPT]: {
    input: z.object({ id: z.string() }),
    output: QaScriptSchema.nullable(),
  },
  [TEST_SUITE.SAVE.SCRIPT]: {
    input: z.object({
      id: z.string().optional(),
      projectId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      steps: z.array(TestSuiteStepSchema),
      tags: z.array(z.string()).optional(),
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
      baseUrlOverride: z.string().optional(),
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
  [TEST_SUITE.TASK['ATTACH-RUN']]: {
    input: z.object({ runId: z.string(), taskId: z.string() }),
    output: SuccessResponseSchema,
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
    input: z.object({ projectId: z.string() }),
    output: z.object({ yaml: z.string(), filePath: z.string(), exists: z.boolean() }),
  },
  [TEST_SUITE.EXPORT['CI-COMMIT']]: {
    input: z.object({ projectId: z.string() }),
    output: z.object({ filePath: z.string(), committed: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW'].CREATE]: {
    input: BrowserViewCreateInputSchema,
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE['BROWSER-VIEW'].NAVIGATE]: {
    input: z.object({ url: z.url() }),
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
    input: z.object({ projectId: z.string() }),
    output: TestSuiteConfigSchema.nullable(),
  },
  [TEST_SUITE.CONFIG.SAVE]: {
    input: z.object({ projectId: z.string(), config: TestSuiteConfigSchema }),
    output: TestSuiteConfigSchema,
  },
  [TEST_SUITE.CONFIG.LIST]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(TestSuiteConfigSchema),
  },
  [TEST_SUITE.CONFIG.DELETE]: {
    input: z.object({ projectId: z.string(), configId: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.CONFIG['SET-ACTIVE']]: {
    input: z.object({ projectId: z.string(), configId: z.string() }),
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
  [TEST_SUITE.ANALYTICS.SUMMARY]: {
    input: z.object({ projectId: z.string() }),
    output: AnalyticsSummarySchema,
  },
  [TEST_SUITE.ANALYTICS.TREND]: {
    input: z.object({ projectId: z.string(), days: z.number().default(30) }),
    output: z.array(TrendPointSchema),
  },
  [TEST_SUITE.ANALYTICS['TOP-FAILURES']]: {
    input: z.object({ projectId: z.string(), limit: z.number().default(10) }),
    output: z.array(TopFailureSchema),
  },
  [TEST_SUITE.ANALYTICS.SLOWEST]: {
    input: z.object({ projectId: z.string(), limit: z.number().default(10) }),
    output: z.array(SlowestTestSchema),
  },
  [TEST_SUITE.ANALYTICS['ERROR-PATTERNS']]: {
    input: z.object({ projectId: z.string(), limit: z.number().default(10) }),
    output: z.array(ErrorPatternSchema),
  },
  [TEST_SUITE.ANALYTICS.FLAKY]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(FlakyTestSchema),
  },
  [TEST_SUITE.ANALYTICS['RUN-HISTORY']]: {
    input: z.object({ scriptId: z.string(), limit: z.number().default(20) }),
    output: z.array(RunHistoryEntrySchema),
  },
  [TEST_SUITE.WATCH.START]: {
    input: z.object({ scriptId: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.WATCH.STOP]: {
    input: z.object({ scriptId: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.WATCH.LIST]: {
    input: z.object({}),
    output: z.array(z.string()),
  },
  [TEST_SUITE.BASELINE.LIST]: {
    input: z.object({ scriptId: z.string() }),
    output: z.array(BaselineRecordSchema),
  },
  [TEST_SUITE.BASELINE.SET]: {
    input: z.object({
      scriptId: z.string(),
      screenshotId: z.string(),
    }),
    output: BaselineRecordSchema,
  },
  [TEST_SUITE.BASELINE.DELETE]: {
    input: z.object({ scriptId: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.DIFF.COMPARE]: {
    input: z.object({
      runId: z.string(),
      sensitivity: DiffSensitivitySchema.default('balanced'),
    }),
    output: z.array(DiffResultSchema),
  },
  [TEST_SUITE.DIFF.LIST]: {
    input: z.object({ runId: z.string() }),
    output: z.array(DiffResultSchema),
  },
  [TEST_SUITE['SHARED-STEPS'].LIST]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(SharedStepGroupSchema),
  },
  [TEST_SUITE['SHARED-STEPS'].GET]: {
    input: z.object({ id: z.string() }),
    output: SharedStepGroupSchema.nullable(),
  },
  [TEST_SUITE['SHARED-STEPS'].CREATE]: {
    input: z.object({
      projectId: z.string(),
      name: z.string(),
      domain: z.string(),
      description: z.string().optional(),
      steps: z.array(TestSuiteStepSchema),
    }),
    output: SharedStepGroupSchema,
  },
  [TEST_SUITE['SHARED-STEPS'].UPDATE]: {
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      domain: z.string().optional(),
      description: z.string().optional(),
      steps: z.array(TestSuiteStepSchema).optional(),
    }),
    output: SharedStepGroupSchema.nullable(),
  },
  [TEST_SUITE['SHARED-STEPS'].DELETE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE['SHARED-STEPS'].DOMAINS]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(z.string()),
  },
  [TEST_SUITE.SCHEDULE.LIST]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(ScheduleRecordSchema),
  },
  [TEST_SUITE.SCHEDULE.GET]: {
    input: z.object({ id: z.string() }),
    output: ScheduleRecordSchema.nullable(),
  },
  [TEST_SUITE.SCHEDULE.CREATE]: {
    input: z.object({
      scriptId: z.string(),
      projectId: z.string(),
      intervalMs: z.number().min(60000),
    }),
    output: ScheduleRecordSchema,
  },
  [TEST_SUITE.SCHEDULE.UPDATE]: {
    input: z.object({
      id: z.string(),
      intervalMs: z.number().min(60000).optional(),
      enabled: z.boolean().optional(),
    }),
    output: ScheduleRecordSchema.nullable(),
  },
  [TEST_SUITE.SCHEDULE.DELETE]: {
    input: z.object({ id: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.SCHEDULE['TRIGGER-NOW']]: {
    input: z.object({ id: z.string() }),
    output: z.object({ runId: z.string() }),
  },
  [TEST_SUITE['DATA-RUN'].PARSE]: {
    input: z.object({ filePath: z.string() }),
    output: z.object({
      rows: z.array(DataRowSchema),
      headers: z.array(z.string()),
      rowCount: z.number(),
    }),
  },
  [TEST_SUITE['DATA-RUN'].EXECUTE]: {
    input: z.object({
      scriptId: z.string(),
      dataFilePath: z.string(),
    }),
    output: z.object({
      runIds: z.array(z.string()),
      totalRows: z.number(),
    }),
  },
  [TEST_SUITE.OPEN.REPORT]: {
    input: z.object({ reportPath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [TEST_SUITE.AUTH.SAVE]: {
    input: z.object({ projectId: z.string() }),
    output: z.object({ storageStatePath: z.string() }),
  },
  [TEST_SUITE.AUTH.CLEAR]: {
    input: z.object({ projectId: z.string() }),
    output: SuccessResponseSchema,
  },
  [TEST_SUITE.BATCH.RUN]: {
    input: z.object({
      scriptIds: z.array(z.string()),
      triggeredBy: z.enum(['manual', 'scheduled', 'ci']).default('manual'),
      baseUrlOverride: z.string().optional(),
    }),
    output: z.object({
      runIds: z.array(z.string()),
      total: z.number(),
    }),
  },
  [TEST_SUITE.SETUP['ENSURE-DEPS']]: {
    input: z.object({ projectId: z.string() }),
    output: z.object({
      installed: z.boolean(),
      alreadyInstalled: z.boolean(),
      error: z.string().optional(),
    }),
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
  [TEST_SUITE_EVENTS.WATCH.TRIGGERED]: {
    payload: z.object({
      scriptId: z.string(),
      runId: z.string(),
      timestamp: z.string(),
    }),
  },
} as const;
