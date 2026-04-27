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

export const TAB = {
  RECORDING: 'recording',
  LIBRARY: 'library',
  RESULTS: 'results',
  SCREENSHOTS: 'screenshots',
  EXPORT: 'export',
  ANALYTICS: 'analytics',
  SHARED_STEPS: 'shared-steps',
} as const;

// ── Default timeouts (ms) ──
export const DEFAULT_NAVIGATION_TIMEOUT = 30_000;
export const DEFAULT_ACTION_TIMEOUT = 10_000;

// ── Default viewport ──
export const DEFAULT_VIEWPORT_WIDTH = 1280;
export const DEFAULT_VIEWPORT_HEIGHT = 720;
export const MIN_VIEWPORT_WIDTH = 320;
export const MIN_VIEWPORT_HEIGHT = 240;

// ── Playwright config ──
export const MAX_WORKERS = 16;
export const MAX_RETRIES = 5;

// ── Analytics thresholds ──
export const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A', color: 'text-green-500' },
  { min: 80, grade: 'B', color: 'text-blue-500' },
  { min: 70, grade: 'C', color: 'text-yellow-500' },
  { min: 60, grade: 'D', color: 'text-orange-500' },
  { min: 0, grade: 'F', color: 'text-destructive' },
] as const;

export const HEALTH_WEIGHTS = {
  passRate: 40,
  stability: 30,
  speed: 30,
} as const;

export const SPEED_THRESHOLDS = {
  fast: 5,
  medium: 30,
  curve: 25,
} as const;

// ── UI constants ──
export const COPY_FEEDBACK_MS = 2_000;
export const ERROR_LINE_TRUNCATION = 20;
export const SPARKLINE_RUN_LIMIT = 10;
