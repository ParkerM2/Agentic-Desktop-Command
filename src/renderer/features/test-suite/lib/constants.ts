import type { TestSuiteConfig } from '@shared/ipc/test-suite';

type ScreenshotMode = TestSuiteConfig['screenshotMode'];

export const SCREENSHOT_MODES: ReadonlyArray<{ value: ScreenshotMode; label: string }> = [
  { value: 'smart', label: 'Smart (recommended)' },
  { value: 'per-click', label: 'Per click' },
  { value: 'per-nav', label: 'Per navigation' },
  { value: 'per-form', label: 'Per form' },
  { value: 'per-assertion', label: 'Per assertion' },
  { value: 'manual', label: 'Manual' },
] as const;

export const STATUS_FILTERS = ['all', 'passed', 'failed', 'flaky', 'no-runs'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
