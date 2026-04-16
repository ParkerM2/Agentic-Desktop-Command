/**
 * Test Suite IPC Handlers
 *
 * Bridges test-suite service to the renderer via IPC.
 * Thin handlers — all logic delegated to service.
 */

import { TEST_SUITE, TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';
import type {
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
  TestSuiteStepSchema,
} from '@shared/ipc/test-suite/schemas';

import type { BrowserViewManager } from './browser-view-manager';
import type { ConfigStore } from './config-store';
import type { IpcRouter } from '../../ipc/router';

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
  getScript: (id: string) => Promise<unknown>;
  saveScript: (input: {
    id?: string;
    name: string;
    description?: string;
    steps: TestSuiteStep[];
  }) => Promise<unknown>;
  deleteScript: (id: string) => Promise<{ success: boolean }>;
  runScript: (input: { scriptId: string; triggeredBy: 'manual' | 'scheduled' | 'ci' }) => Promise<{ runId: string }>;
  getRun: (runId: string) => Promise<QaRun | null>;
  listRuns: (input: { scriptId?: string }) => Promise<QaRun[]>;
  exportFile: (input: { runId: string; format: 'json' | 'html' | 'csv' }) => Promise<{ filePath: string }>;
  exportGithub: (input: { runId: string; owner: string; repo: string }) => Promise<{ issueUrl: string }>;
  onRunEvent: (listener: (event: TestSuiteRunEvent) => void) => void;
  configStore: ConfigStore;
  browserViewManager: BrowserViewManager;
}

// ─── Handler Registration ──────────────────────────────────────

export function registerTestSuiteHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
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

  // ── Invoke handlers ───────────────────────────────────────────

  router.handle(TEST_SUITE.LIST.SCRIPTS, () =>
    testSuiteService.listScripts() as never,
  );

  router.handle(TEST_SUITE.GET.SCRIPT, ({ id }) =>
    testSuiteService.getScript(id) as never,
  );

  router.handle(TEST_SUITE.SAVE.SCRIPT, (input) =>
    testSuiteService.saveScript(input) as never,
  );

  router.handle(TEST_SUITE.DELETE.SCRIPT, ({ id }) =>
    testSuiteService.deleteScript(id),
  );

  router.handle(TEST_SUITE.RUN.SCRIPT, (input) =>
    testSuiteService.runScript(input),
  );

  router.handle(TEST_SUITE.GET.RUN, ({ runId }) =>
    testSuiteService.getRun(runId),
  );

  router.handle(TEST_SUITE.LIST.RUNS, (input) =>
    testSuiteService.listRuns(input),
  );

  router.handle(TEST_SUITE.EXPORT.FILE, (input) =>
    testSuiteService.exportFile(input),
  );

  router.handle(TEST_SUITE.EXPORT.GITHUB, (input) =>
    testSuiteService.exportGithub(input),
  );

  // ── Stub handlers (Wave 1 T7) ────────────────────────────────
  // Return schema-compatible empty shapes so renderer hooks resolve.
  // Real implementations land in later waves.

  router.handle(TEST_SUITE.EXPORT['CI-PREVIEW'], () =>
    Promise.resolve({ yaml: '', filePath: '', exists: false }),
  );

  router.handle(TEST_SUITE.EXPORT['CI-COMMIT'], () =>
    Promise.resolve({ filePath: '', committed: false }),
  );

  const { browserViewManager: bvm } = testSuiteService;

  router.handle(TEST_SUITE['BROWSER-VIEW'].CREATE, ({ url, bounds }) =>
    Promise.resolve(bvm.create(url, bounds)),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].NAVIGATE, ({ url }) =>
    Promise.resolve(bvm.navigate(url)),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].BACK, () =>
    Promise.resolve(bvm.back()),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].FORWARD, () =>
    Promise.resolve(bvm.forward()),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].RELOAD, () =>
    Promise.resolve(bvm.reload()),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW']['SET-BOUNDS'], (bounds) =>
    Promise.resolve(bvm.setBounds(bounds)),
  );

  router.handle(TEST_SUITE['BROWSER-VIEW'].DESTROY, () =>
    Promise.resolve(bvm.destroy()),
  );

  const { configStore } = testSuiteService;

  router.handle(TEST_SUITE.CONFIG.GET, ({ projectId }) =>
    Promise.resolve(configStore.getActive(projectId)),
  );

  router.handle(TEST_SUITE.CONFIG.LIST, ({ projectId }) =>
    Promise.resolve(configStore.list(projectId)),
  );

  router.handle(TEST_SUITE.CONFIG.SAVE, ({ projectId, config }) =>
    Promise.resolve(configStore.save(projectId, config)),
  );

  router.handle(TEST_SUITE.CONFIG.DELETE, ({ projectId, configId }) => {
    configStore.delete(projectId, configId);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE.CONFIG['SET-ACTIVE'], ({ projectId, configId }) => {
    configStore.setActive(projectId, configId);
    const active = configStore.getActive(projectId);
    if (active) {
      router.emit(TEST_SUITE_EVENTS.CONFIG.CHANGED, { config: active });
    }
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE.SCREENSHOT.LIST, () => Promise.resolve([]));

  router.handle(TEST_SUITE.SCREENSHOT['EXPORT-ZIP'], () =>
    Promise.resolve({ filePath: '' }),
  );

  router.handle(TEST_SUITE.SCREENSHOT.COPY, () =>
    Promise.resolve({ filePath: '' }),
  );
}
