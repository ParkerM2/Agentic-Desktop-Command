/**
 * Test Suite IPC Handlers
 *
 * Bridges test-suite service to the renderer via IPC.
 * Thin handlers — all logic delegated to service.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { shell } from 'electron';

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { TEST_SUITE, TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';
import { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';
import type {
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
} from '@shared/ipc/test-suite/schemas';

import { parseDataFile } from './data-runner';
import { compareScreenshots } from './diff-engine';
import { ensurePlaywrightConfig } from './playwright-config-writer';
import { writeTestSuiteGitignore, writeTestSuiteReadme } from './readme-writer';
import { testSuiteDiffs } from './schema-baselines';
import { writeSpecFile } from './script-writer';
import { commitWorkflow, previewWorkflow } from './workflow-exporter';

import type { Analytics } from './analytics';
import type { BaselineStore } from './baseline-store';
import type { BrowserViewManager } from './browser-view-manager';
import type { ConfigStore } from './config-store';
import type { SchedulerService } from './scheduler';
import type { ScreenshotStore } from './screenshot-capture';
import type { ScriptStore } from './script-store';
import type { SharedStepsStore } from './shared-steps-store';
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
  getScript: (id: string) => Promise<{ filePath?: string } | null>;
  saveScript: (input: {
    id?: string;
    projectId: string;
    name: string;
    description?: string;
    steps: TestSuiteStep[];
    filePath?: string;
  }) => Promise<unknown>;
  deleteScript: (id: string) => Promise<{ success: boolean }>;
  runScript: (input: { scriptId: string; triggeredBy: 'manual' | 'scheduled' | 'ci' | 'auto-trigger' }) => Promise<{ runId: string }>;
  getRun: (runId: string) => Promise<QaRun | null>;
  listRuns: (input: { scriptId?: string }) => Promise<QaRun[]>;
  exportFile: (input: { runId: string; format: 'json' | 'html' | 'csv' }) => Promise<{ filePath: string }>;
  exportGithub: (input: { runId: string; owner: string; repo: string }) => Promise<{ issueUrl: string }>;
  attachRunToTask: (runId: string, taskId: string) => Promise<{ success: boolean }>;
  onRunEvent: (listener: (event: TestSuiteRunEvent) => void) => void;
  configStore: ConfigStore;
  browserViewManager: BrowserViewManager;
  screenshotStore: ScreenshotStore;
  analytics: Analytics;
  fileWatcher: FileWatcher;
  baselineStore: BaselineStore;
  scriptStore: ScriptStore;
  sharedStepsStore: SharedStepsStore;
  scheduler: SchedulerService;
  getProjectPath: (projectId: string) => string | undefined;
  db: AdcDatabase;
}

// ─── Handler Registration ──────────────────────────────────────

export function registerTestSuiteHandlers(
  router: IpcRouter,
  testSuiteService: TestSuiteService,
  projectService: ProjectService,
): void {
  const { db } = testSuiteService;
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
      writeTestSuiteGitignore({ projectRoot: projectPath, testDir });
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

  router.handle(TEST_SUITE.TASK['ATTACH-RUN'], ({ runId, taskId }) =>
    testSuiteService.attachRunToTask(runId, taskId),
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

  router.handle(TEST_SUITE.SCREENSHOT.LIST, ({ runId, scriptId }) => {
    if (runId) return Promise.resolve(testSuiteService.screenshotStore.list(runId));
    if (scriptId) return Promise.resolve(testSuiteService.screenshotStore.listByScript(scriptId));
    return Promise.resolve([]);
  });

  router.handle(TEST_SUITE.SCREENSHOT['EXPORT-ZIP'], async ({ runId }) => {
    const screenshots = testSuiteService.screenshotStore.list(runId);
    if (screenshots.length === 0) return { filePath: '' };

    // Return the parent directory of the screenshots and open it in the file manager
    const dir = path.dirname(screenshots[0].filePath);
    await shell.openPath(dir);
    return { filePath: dir };
  });

  router.handle(TEST_SUITE.SCREENSHOT.COPY, async ({ id, destPath }) => {
    const screenshot = testSuiteService.screenshotStore.get(id);
    if (!screenshot) return { filePath: '' };

    // Ensure destination directory exists
    await mkdir(path.dirname(destPath), { recursive: true });
    await copyFile(screenshot.filePath, destPath);
    return { filePath: destPath };
  });

  // ── Analytics handlers ──────────────────────────────────────────

  const { analytics } = testSuiteService;

  router.handle(TEST_SUITE.ANALYTICS.SUMMARY, ({ projectId }) =>
    Promise.resolve(analytics.summary(projectId)),
  );

  router.handle(TEST_SUITE.ANALYTICS.TREND, ({ projectId, days }) =>
    Promise.resolve(analytics.trend(projectId, days)),
  );

  router.handle(TEST_SUITE.ANALYTICS['TOP-FAILURES'], ({ projectId, limit }) =>
    Promise.resolve(analytics.topFailures(projectId, limit)),
  );

  router.handle(TEST_SUITE.ANALYTICS.SLOWEST, ({ projectId, limit }) =>
    Promise.resolve(analytics.slowestTests(projectId, limit)),
  );

  router.handle(TEST_SUITE.ANALYTICS['ERROR-PATTERNS'], ({ projectId, limit }) =>
    Promise.resolve(analytics.errorPatterns(projectId, limit)),
  );

  router.handle(TEST_SUITE.ANALYTICS.FLAKY, ({ projectId }) =>
    Promise.resolve(analytics.flakyTests(projectId)),
  );

  router.handle(TEST_SUITE.ANALYTICS['RUN-HISTORY'], ({ scriptId, limit }) =>
    Promise.resolve(analytics.runHistory(scriptId, limit)),
  );

  // ── Watch mode handlers ────────────────────────────────────────

  router.handle(TEST_SUITE.WATCH.START, async ({ scriptId }) => {
    const script = await testSuiteService.getScript(scriptId);
    if (!script?.filePath) return { success: false };

    testSuiteService.fileWatcher.watch(scriptId, script.filePath, () => {
      void testSuiteService
        .runScript({ scriptId, triggeredBy: 'auto-trigger' })
        .then(({ runId }) => {
          router.emit(TEST_SUITE_EVENTS.WATCH.TRIGGERED, {
            scriptId,
            runId,
            timestamp: new Date().toISOString(),
          });
          return null;
        })
        .catch(() => {
          // Swallow — the watcher callback must not throw.
        });
    });

    return { success: true };
  });

  router.handle(TEST_SUITE.WATCH.STOP, ({ scriptId }) => {
    testSuiteService.fileWatcher.unwatch(scriptId);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE.WATCH.LIST, () =>
    Promise.resolve(testSuiteService.fileWatcher.listWatched()),
  );

  // ── Baseline handlers ──────────────────────────────────────────

  router.handle(TEST_SUITE.BASELINE.LIST, ({ scriptId }) =>
    Promise.resolve(testSuiteService.baselineStore.listByScript(scriptId)),
  );

  router.handle(TEST_SUITE.BASELINE.SET, ({ scriptId, screenshotId }) => {
    const screenshot = testSuiteService.screenshotStore.get(screenshotId);
    if (!screenshot) return Promise.reject(new Error('Screenshot not found'));

    const script = testSuiteService.scriptStore.get(scriptId);
    if (!script) return Promise.reject(new Error('Script not found'));

    const projectPath = testSuiteService.getProjectPath(script.projectId);
    if (!projectPath) {
      return Promise.reject(new Error(`Project path not found for projectId: ${script.projectId}`));
    }

    const config = testSuiteService.configStore.getActive(script.projectId);
    const testDir = config?.testDirectory ?? 'tests/e2e';
    const baselineDir = path.join(projectPath, testDir, 'baselines');

    return Promise.resolve(
      testSuiteService.baselineStore.setBaseline({
        scriptId,
        stepIndex: screenshot.stepIndex,
        stepLabel: screenshot.stepLabel,
        sourceFilePath: screenshot.filePath,
        baselineDir,
        width: screenshot.width,
        height: screenshot.height,
      }),
    );
  });

  router.handle(TEST_SUITE.BASELINE.DELETE, ({ scriptId }) => {
    testSuiteService.baselineStore.deleteByScript(scriptId);
    return Promise.resolve({ success: true });
  });

  const SENSITIVITY_THRESHOLDS = { strict: 0, balanced: 5, relaxed: 15 } as const;

  router.handle(TEST_SUITE.DIFF.COMPARE, async ({ runId, sensitivity }) => {
    const screenshots = testSuiteService.screenshotStore.list(runId);
    const threshold = SENSITIVITY_THRESHOLDS[sensitivity];
    const results: Array<{
      id: string;
      runId: string;
      baselineId: string;
      screenshotId: string;
      diffFilePath: string;
      mismatchPercentage: number;
      mismatchPixels: number;
      threshold: number;
      status: 'match' | 'mismatch' | 'size-mismatch';
      createdAt: string;
    }> = [];

    for (const ss of screenshots) {
      const baseline = testSuiteService.baselineStore.get(ss.scriptId, ss.stepIndex);
      if (!baseline) continue;

      const diffResult = await compareScreenshots({
        baselinePath: baseline.filePath,
        actualPath: ss.filePath,
        outputDir: path.join(path.dirname(ss.filePath), 'diffs'),
        sensitivity,
      });

      const record = {
        id: nanoid(),
        runId,
        baselineId: baseline.id,
        screenshotId: ss.id,
        diffFilePath: diffResult.diffFilePath,
        mismatchPercentage: diffResult.mismatchPercentage,
        mismatchPixels: diffResult.mismatchPixels,
        threshold,
        status: diffResult.status,
        createdAt: new Date().toISOString(),
      };

      db.insert(testSuiteDiffs).values(record).run();
      results.push(record);
    }

    return results;
  });

  router.handle(TEST_SUITE.DIFF.LIST, ({ runId }) =>
    Promise.resolve(
      db
        .select()
        .from(testSuiteDiffs)
        .where(eq(testSuiteDiffs.runId, runId))
        .all() as Array<{
          id: string;
          runId: string;
          baselineId: string;
          screenshotId: string;
          diffFilePath: string;
          mismatchPercentage: number;
          mismatchPixels: number;
          threshold: number;
          status: 'match' | 'mismatch' | 'size-mismatch';
          createdAt: string;
        }>,
    ),
  );

  // ── Shared step group handlers ─────────────────────────────────

  const { sharedStepsStore, scheduler } = testSuiteService;

  router.handle(TEST_SUITE['SHARED-STEPS'].LIST, ({ projectId }) =>
    Promise.resolve(sharedStepsStore.list(projectId)),
  );

  router.handle(TEST_SUITE['SHARED-STEPS'].GET, ({ id }) =>
    Promise.resolve(sharedStepsStore.get(id)),
  );

  router.handle(TEST_SUITE['SHARED-STEPS'].CREATE, (input) =>
    Promise.resolve(sharedStepsStore.create(input)),
  );

  router.handle(TEST_SUITE['SHARED-STEPS'].UPDATE, ({ id, ...params }) =>
    Promise.resolve(sharedStepsStore.update(id, params)),
  );

  router.handle(TEST_SUITE['SHARED-STEPS'].DELETE, ({ id }) => {
    sharedStepsStore.delete(id);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE['SHARED-STEPS'].DOMAINS, ({ projectId }) =>
    Promise.resolve(sharedStepsStore.domains(projectId)),
  );

  // ── Schedule handlers ──────────────────────────────────────────

  router.handle(TEST_SUITE.SCHEDULE.LIST, ({ projectId }) =>
    Promise.resolve(scheduler.list(projectId)),
  );

  router.handle(TEST_SUITE.SCHEDULE.GET, ({ id }) =>
    Promise.resolve(scheduler.get(id)),
  );

  router.handle(TEST_SUITE.SCHEDULE.CREATE, (input) =>
    Promise.resolve(scheduler.create(input)),
  );

  router.handle(TEST_SUITE.SCHEDULE.UPDATE, ({ id, ...params }) =>
    Promise.resolve(scheduler.update(id, params)),
  );

  router.handle(TEST_SUITE.SCHEDULE.DELETE, ({ id }) => {
    scheduler.delete(id);
    return Promise.resolve({ success: true });
  });

  router.handle(TEST_SUITE.SCHEDULE['TRIGGER-NOW'], async ({ id }) => {
    const schedule = scheduler.get(id);
    if (!schedule) throw new Error(`Schedule not found: ${id}`);
    const result = await testSuiteService.runScript({
      scriptId: schedule.scriptId,
      triggeredBy: 'scheduled',
    });
    router.emit(TEST_SUITE_EVENTS.RUN.STARTED, {
      runId: result.runId,
      scriptId: schedule.scriptId,
      timestamp: new Date().toISOString(),
    });
    return result;
  });

  // ── Data-driven run handlers ───────────────────────────────────

  router.handle(TEST_SUITE['DATA-RUN'].PARSE, ({ filePath }) => {
    const rows = parseDataFile(filePath);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return Promise.resolve({ rows, headers, rowCount: rows.length });
  });

  router.handle(TEST_SUITE['DATA-RUN'].EXECUTE, async ({ scriptId, dataFilePath }) => {
    const rows = parseDataFile(dataFilePath);
    const runIds: string[] = [];

    for (const _row of rows) {
      const { runId } = await testSuiteService.runScript({
        scriptId,
        triggeredBy: 'manual',
      });
      runIds.push(runId);
    }

    return { runIds, totalRows: rows.length };
  });
}
