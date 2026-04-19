/**
 * Test Suite IPC — Barrel Export
 */

export { testSuiteEvents, testSuiteInvoke } from './contract';
export {
  AnalyticsSummarySchema,
  BaselineRecordSchema,
  BrowserViewBoundsSchema,
  BrowserViewCreateInputSchema,
  DataRowSchema,
  DiffResultSchema,
  DiffSensitivitySchema,
  ErrorPatternSchema,
  FlakySeveritySchema,
  FlakyTestSchema,
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
  QaScriptSchema,
  QaStepAssertSchema,
  QaStepClickSchema,
  QaStepFillSchema,
  QaStepNavigateSchema,
  QaStepPressSchema,
  QaStepSelectSchema,
  QaStepTypeSchema,
  QaStepWaitSchema,
  RunHistoryEntrySchema,
  ScheduleRecordSchema,
  SharedStepGroupSchema,
  SlowestTestSchema,
  StepContextSchema,
  TestSuiteConfigSchema,
  TestSuiteScreenshotSchema,
  TestSuiteStepSchema,
  TopFailureSchema,
  TrendPointSchema,
} from './schemas';
export type { TestSuiteConfig, TestSuiteScreenshot } from './schemas';
