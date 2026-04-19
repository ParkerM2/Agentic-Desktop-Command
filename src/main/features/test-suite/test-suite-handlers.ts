/**
 * Test Suite IPC Handlers
 *
 * Bridges test-suite service to the renderer via IPC.
 * Thin handlers — all logic delegated to service.
 *
 * Domain-specific handler groups are registered via sub-modules in ./handlers/.
 */

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';
import type {
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
  TestSuiteStepSchema,
} from '@shared/ipc/test-suite/schemas';

import { registerAnalyticsHandlers } from './handlers/analytics-handlers';
import { registerAuthHandlers } from './handlers/auth-handlers';
import { registerBaselineHandlers } from './handlers/baseline-handlers';
import { registerBrowserViewHandlers } from './handlers/browser-view-handlers';
import { registerConfigHandlers } from './handlers/config-handlers';
import { registerDataRunHandlers } from './handlers/data-run-handlers';
import { registerExportHandlers } from './handlers/export-handlers';
import { registerRunHandlers } from './handlers/run-handlers';
import { registerScheduleHandlers } from './handlers/schedule-handlers';
import { registerScreenshotHandlers } from './handlers/screenshot-handlers';
import { registerScriptHandlers } from './handlers/script-handlers';
import { registerSetupHandlers } from './handlers/setup-handlers';
import { registerSharedStepsHandlers } from './handlers/shared-steps-handlers';
import { registerWatchHandlers } from './handlers/watch-handlers';

import type { Analytics } from './analytics';
import type { BaselineService } from './baseline-service';
import type { BrowserViewManager } from './browser-view-manager';
import type { ConfigService } from './config-service';
import type { SchedulerService } from './scheduler';
import type { ScreenshotService } from './screenshot-service';
import type { ScriptService } from './script-service';
import type { SharedStepsService } from './shared-steps-service';
import type { FileWatcher } from './watcher';
import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';
import type { ProjectService } from '../projects/project-service';

// ─── Locally-inferred types from shared schemas ────────────────
// These use `infer` to avoid importing zod directly in main/.

type InferZodType<T extends { _output: unknown }> = T['_output'];

type QaRun = InferZodType<typeof QaRunSchema>;
type QaRunStatus = InferZodType<typeof QaRunStatusSchema>;
type QaRunReport = InferZodType<typeof QaRunReportSchema>;
type TestSuiteStep = InferZodType<typeof TestSuiteStepSchema>;

// ─── Service Interface ─────────────────────────────────────────
// Defined locally until Task #34 merges.

export interface TestSuiteRunEvent {
  type: 'output' | 'screenshot' | 'complete';
  runId: string;
  line?: string;
  timestamp?: string;
  screenshotPath?: string;
  stepIndex?: number;
  status?: QaRunStatus;
  report?: QaRunReport;
}

export interface TestSuiteService {
  listScripts: () => Promise<unknown[]>;
  listScriptsByProject: (projectId: string) => Promise<unknown[]>;
  getScript: (id: string) => Promise<{ filePath?: string; steps: unknown[]; targetUrl: string; name: string; projectId: string } | null>;
  saveScript: (input: {
    id?: string;
    projectId: string;
    name: string;
    description?: string;
    steps: TestSuiteStep[];
    tags?: string[];
    filePath?: string;
  }) => Promise<unknown>;
  deleteScript: (id: string) => Promise<{ success: boolean }>;
  runScript: (input: { scriptId: string; triggeredBy: 'manual' | 'scheduled' | 'ci' | 'auto-trigger'; filePathOverride?: string; baseUrlOverride?: string }) => Promise<{ runId: string }>;
  getRun: (runId: string) => Promise<QaRun | null>;
  listRuns: (input: { scriptId?: string }) => Promise<QaRun[]>;
  exportFile: (input: { runId: string; format: 'json' | 'html' | 'csv' }) => Promise<{ filePath: string }>;
  exportGithub: (input: { runId: string; owner: string; repo: string }) => Promise<{ issueUrl: string }>;
  attachRunToTask: (runId: string, taskId: string) => Promise<{ success: boolean }>;
  onRunEvent: (listener: (event: TestSuiteRunEvent) => void) => void;
  configStore: ConfigService;
  browserViewManager: BrowserViewManager;
  screenshotStore: ScreenshotService;
  analytics: Analytics;
  fileWatcher: FileWatcher;
  baselineStore: BaselineService;
  scriptStore: ScriptService;
  sharedStepsStore: SharedStepsService;
  scheduler: SchedulerService;
  getProjectPath: (projectId: string) => string | undefined;
  db: AdcDatabase;
  saveAuthState: (projectId: string) => Promise<{ storageStatePath: string }>;
  clearAuthState: (projectId: string) => Promise<{ success: boolean }>;
  batchRun: (input: {
    scriptIds: string[];
    triggeredBy: 'manual' | 'scheduled' | 'ci';
    baseUrlOverride?: string;
  }) => Promise<{ runIds: string[]; total: number }>;
}

// ─── Handler Registration ──────────────────────────────────────

export function registerTestSuiteHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
  projectService: ProjectService,
): void {
  // ── Event forwarding ──────────────────────────────────────────

  testSuiteService.onRunEvent((event) => {
    if (event.type === 'output' && event.line !== undefined && event.timestamp !== undefined) {
      router.emit(TEST_SUITE_EVENTS.OUTPUT.LINE, {
        runId: event.runId,
        line: event.line,
        timestamp: event.timestamp,
      });
    }

    if (
      event.type === 'screenshot' &&
      event.screenshotPath !== undefined &&
      event.stepIndex !== undefined &&
      event.timestamp !== undefined
    ) {
      router.emit(TEST_SUITE_EVENTS.RUN.SCREENSHOT, {
        runId: event.runId,
        screenshotPath: event.screenshotPath,
        stepIndex: event.stepIndex,
        timestamp: event.timestamp,
      });
    }

    if (event.type === 'complete' && event.status !== undefined && event.report !== undefined) {
      router.emit(TEST_SUITE_EVENTS.RUN.COMPLETED, {
        runId: event.runId,
        status: event.status,
        report: event.report,
      });
    }
  });

  // ── Domain-specific handler groups ────────────────────────────

  registerScriptHandlers(router, testSuiteService, projectService);
  registerRunHandlers(router, testSuiteService);
  registerExportHandlers(router, testSuiteService, projectService);
  registerBrowserViewHandlers(router, testSuiteService);
  registerConfigHandlers(router, testSuiteService);
  registerScreenshotHandlers(router, testSuiteService);
  registerDataRunHandlers(router, testSuiteService);
  registerAuthHandlers(router, testSuiteService);
  registerAnalyticsHandlers(router, testSuiteService);
  registerWatchHandlers(router, testSuiteService);
  registerBaselineHandlers(router, testSuiteService);
  registerSharedStepsHandlers(router, testSuiteService);
  registerScheduleHandlers(router, testSuiteService);
  registerSetupHandlers(router, testSuiteService);
}
