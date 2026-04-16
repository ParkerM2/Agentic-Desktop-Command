/**
 * Test Suite IPC Handlers
 *
 * Bridges test-suite service to the renderer via IPC.
 * Thin handlers — all logic delegated to service.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { shell } from 'electron';

import { TEST_SUITE, TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';
import { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';
import type {
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
} from '@shared/ipc/test-suite/schemas';

import { ensurePlaywrightConfig } from './playwright-config-writer';
import { writeTestSuiteReadme } from './readme-writer';
import { getScreenshotById, getScreenshots } from './screenshot-capture';
import { writeSpecFile } from './script-writer';
import { commitWorkflow, previewWorkflow } from './workflow-exporter';

import type { BrowserViewManager } from './browser-view-manager';
import type { ConfigStore } from './config-store';
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
  getScript: (id: string) => Promise<unknown>;
  saveScript: (input: {
    id?: string;
    projectId: string;
    name: string;
    description?: string;
    steps: TestSuiteStep[];
    filePath?: string;
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

  // ── Invoke handlers ───────────────────────────────────────────

  router.handle(TEST_SUITE.LIST.SCRIPTS, () =>
    testSuiteService.listScripts() as never,
  );

  router.handle(TEST_SUITE.GET.SCRIPT, ({ id }) =>
    testSuiteService.getScript(id) as never,
  );

  router.handle(TEST_SUITE.SAVE.SCRIPT, (input) => {
    const { projectId, steps } = input;
    const projectPath = projectService.getProjectPath(projectId);
    const config = testSuiteService.configStore.getActive(projectId);

    // If we have both a project path and an active config, write files to disk
    let filePath = '';
    if (projectPath && config) {
      const testDir = config.testDirectory || 'tests/e2e';
      const baseUrl = config.targetUrl;

      filePath = writeSpecFile({
        projectRoot: projectPath,
        testDir,
        name: input.name,
        baseUrl,
        steps,
        screenshotMode: config.screenshotMode,
      });

      ensurePlaywrightConfig({ projectRoot: projectPath, testDir, baseUrl });
      writeTestSuiteReadme({ projectRoot: projectPath, testDir });
    }

    return testSuiteService.saveScript({ ...input, filePath }) as never;
  });

  router.handle(TEST_SUITE.DELETE.SCRIPT, ({ id }) =>
    testSuiteService.deleteScript(id),
  );

  router.handle(TEST_SUITE.RUN.SCRIPT, async (input) => {
    const result = await testSuiteService.runScript(input);
    router.emit(TEST_SUITE_EVENTS.RUN.STARTED, {
      runId: result.runId,
      scriptId: input.scriptId,
      timestamp: new Date().toISOString(),
    });
    return result;
  });

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

  // ── CI export handlers ────────────────────────────────────────

  router.handle(TEST_SUITE.EXPORT['CI-PREVIEW'], ({ projectId }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (!projectPath) return Promise.resolve({ yaml: '', filePath: '', exists: false });

    const config = testSuiteService.configStore.getActive(projectId);
    const testDir = config?.testDirectory ?? 'tests/e2e';

    const scripts = testSuiteService.listScripts() as Promise<Array<{ name: string }>>;
    return scripts.then((list) => {
      const specNames = list.map((s) => s.name);
      return previewWorkflow(projectPath, testDir, specNames);
    });
  });

  router.handle(TEST_SUITE.EXPORT['CI-COMMIT'], ({ projectId }) => {
    const projectPath = projectService.getProjectPath(projectId);
    if (!projectPath) return Promise.resolve({ filePath: '', committed: false });

    const config = testSuiteService.configStore.getActive(projectId);
    const testDir = config?.testDirectory ?? 'tests/e2e';

    const scripts = testSuiteService.listScripts() as Promise<Array<{ name: string }>>;
    return scripts.then((list) => {
      const specNames = list.map((s) => s.name);
      return commitWorkflow(projectPath, testDir, specNames);
    });
  });

  const { browserViewManager: bvm } = testSuiteService;

  // ── Recorder step forwarding ─────────────────────────────────
  // Preload emits steps in contract-normalized shape; we validate,
  // wrap with stepIndex + timestamp, and forward to renderer.

  const recorderEmittableTypes = new Set(['navigate', 'click', 'fill', 'select', 'press']);
  let recorderStepIndex = 0;

  function normalizeStep(raw: unknown): TestSuiteStep | null {
    const parsed = TestSuiteStepSchema.safeParse(raw);
    if (!parsed.success) return null;
    if (!recorderEmittableTypes.has(parsed.data.type)) return null;
    return parsed.data;
  }

  bvm.setStepEmitter((raw) => {
    const step = normalizeStep(raw);
    if (!step) return;
    router.emit(TEST_SUITE_EVENTS.RECORDER.STEP, {
      stepIndex: recorderStepIndex++,
      step,
      timestamp: new Date().toISOString(),
    });
  });

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

  router.handle(TEST_SUITE.SCREENSHOT.LIST, ({ runId }) => {
    if (!runId) return Promise.resolve([]);
    return Promise.resolve(getScreenshots(runId));
  });

  router.handle(TEST_SUITE.SCREENSHOT['EXPORT-ZIP'], async ({ runId }) => {
    const screenshots = getScreenshots(runId);
    if (screenshots.length === 0) return { filePath: '' };

    // Return the parent directory of the screenshots and open it in the file manager
    const dir = path.dirname(screenshots[0].filePath);
    await shell.openPath(dir);
    return { filePath: dir };
  });

  router.handle(TEST_SUITE.SCREENSHOT.COPY, async ({ id, destPath }) => {
    const screenshot = getScreenshotById(id);
    if (!screenshot) return { filePath: '' };

    // Ensure destination directory exists
    await mkdir(path.dirname(destPath), { recursive: true });
    await copyFile(screenshot.filePath, destPath);
    return { filePath: destPath };
  });
}
