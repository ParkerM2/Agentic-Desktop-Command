/**
 * Test Suite IPC — Barrel Export
 */

export * from './analytics-schemas';
export { testSuiteEvents, testSuiteInvoke } from './contract';
export {
  BrowserViewBoundsSchema,
  BrowserViewCreateInputSchema,
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
  TestSuiteConfigSchema,
  TestSuiteScreenshotSchema,
  TestSuiteStepSchema,
} from './schemas';
export type { TestSuiteConfig, TestSuiteScreenshot } from './schemas';
