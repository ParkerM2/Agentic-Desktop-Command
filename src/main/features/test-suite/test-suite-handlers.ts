/**
 * Test Suite IPC Handlers
 *
 * Bridges test-suite service to the renderer via IPC.
 * Thin handlers — all logic delegated to service.
 *
 * Domain-specific handler groups are registered via sub-modules in ./handlers/.
 */

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

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

import type { IpcRouter } from '../../ipc/router';
import type { ProjectService } from '../projects/project-service';

export type { TestSuiteService, TestSuiteRunEvent } from './test-suite-service';

import type { TestSuiteService } from './test-suite-service';

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
