/**
 * Test Suite Service — Factory
 *
 * Composes script store, runner, and script-writer into a single facade that
 * satisfies the IPC handler interface expected by test-suite-handlers.ts.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { BrowserWindow } from 'electron';

import { eq } from 'drizzle-orm';

import type { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';

import { testSuiteRuns } from '../../db/schema';

import { createAnalytics } from './analytics';
import { createBaselineStore } from './baseline-store';
import { createBrowserViewManager } from './browser-view-manager';
import { createConfigStore } from './config-store';
import { writePlaywrightConfig } from './playwright-config-writer';
import { createRunner } from './runner';
import { createScheduler, sendTestNotification } from './scheduler';
import { createScreenshotStore } from './screenshot-capture';
import { createScriptStore } from './script-store';
import { writeSpecFile } from './script-writer';
import { createSharedStepsStore } from './shared-steps-store';
import { createFileWatcher } from './watcher';

import type { Analytics } from './analytics';
import type { BaselineStore } from './baseline-store';
import type { BrowserViewManager } from './browser-view-manager';
import type { ConfigStore } from './config-store';
import type { QaRunner, QaRunRecord, RunnerEventHandlers } from './runner';
import type { SchedulerService } from './scheduler';
import type { ScreenshotStore } from './screenshot-capture';
import type { ScriptStore, QaScript } from './script-store';
import type { SharedStepsStore } from './shared-steps-store';
import type { FileWatcher } from './watcher';
import type { AdcDatabase } from '../../db';

type TestSuiteStep = typeof TestSuiteStepSchema extends { _output: infer T } ? T : never;

// ─── IPC-compatible run record (triggeredBy without 'auto-trigger') ──

export interface QaRunIpcRecord {
  id: string;
  scriptId: string;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
  triggeredBy: 'manual' | 'scheduled' | 'ci';
  startedAt: string;
  completedAt?: string;
  outputLines: string[];
  screenshots: string[];
  error?: string;
  stepsPassed: number;
  stepsFailed: number;
  durationMs: number;
}

// ─── Run event listener type ──────────────────────────────────

export interface TestSuiteRunEvent {
  type: 'output' | 'screenshot' | 'complete';
  runId: string;
  line?: string;
  timestamp?: string;
  screenshotPath?: string;
  stepIndex?: number;
  status?: QaRunRecord['status'];
  report?: {
    runId: string;
    scriptId: string;
    status: QaRunRecord['status'];
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    duration: number;
    screenshots: string[];
    outputLines: string[];
    startedAt: string;
    completedAt?: string;
  };
}

// ─── Facade interface (satisfies test-suite-handlers.ts) ────────

export interface TestSuiteService {
  // Sub-services (used by qa-trigger.ts and other internal consumers)
  scriptStore: ScriptStore;
  runner: QaRunner;
  configStore: ConfigStore;
  browserViewManager: BrowserViewManager;
  screenshotStore: ScreenshotStore;
  analytics: Analytics;
  fileWatcher: FileWatcher;
  baselineStore: BaselineStore;
  sharedStepsStore: SharedStepsStore;
  scheduler: SchedulerService;
  getProjectPath: (projectId: string) => string | undefined;
  db: AdcDatabase;

  // Async facade methods (used by IPC handler layer)
  listScripts: () => Promise<QaScript[]>;
  listScriptsByProject: (projectId: string) => Promise<QaScript[]>;
  getScript: (id: string) => Promise<QaScript | null>;
  saveScript: (input: {
    id?: string;
    projectId: string;
    name: string;
    description?: string;
    steps: TestSuiteStep[];
    tags?: string[];
    filePath?: string;
  }) => Promise<QaScript>;
  deleteScript: (id: string) => Promise<{ success: boolean }>;
  runScript: (input: {
    scriptId: string;
    triggeredBy: 'manual' | 'scheduled' | 'ci' | 'auto-trigger';
    filePathOverride?: string;
    baseUrlOverride?: string;
  }) => Promise<{ runId: string }>;
  getRun: (runId: string) => Promise<QaRunIpcRecord | null>;
  listRuns: (input: { scriptId?: string }) => Promise<QaRunIpcRecord[]>;
  exportFile: (input: {
    runId: string;
    format: 'json' | 'html' | 'csv';
  }) => Promise<{ filePath: string }>;
  exportGithub: (input: {
    runId: string;
    owner: string;
    repo: string;
  }) => Promise<{ issueUrl: string }>;
  attachRunToTask: (runId: string, taskId: string) => Promise<{ success: boolean }>;
  onRunEvent: (listener: (event: TestSuiteRunEvent) => void) => void;
  saveAuthState: (projectId: string) => Promise<{ storageStatePath: string }>;
  clearAuthState: (projectId: string) => Promise<{ success: boolean }>;
  batchRun: (input: {
    scriptIds: string[];
    triggeredBy: 'manual' | 'scheduled' | 'ci';
    baseUrlOverride?: string;
  }) => Promise<{ runIds: string[]; total: number }>;
}

export function createTestSuiteService(
  db: AdcDatabase,
  deps: {
    getMainWindow: () => BrowserWindow | null;
    getProjectPath: (projectId: string) => string | undefined;
  },
): TestSuiteService {
  const scriptStore = createScriptStore(db);
  const screenshotStore = createScreenshotStore(db);
  const browserViewManager = createBrowserViewManager(deps.getMainWindow);
  const runEventListeners: Array<(event: TestSuiteRunEvent) => void> = [];

  // Tracks screenshotDir per runId so onComplete can index screenshots
  const runScreenshotDirs = new Map<string, { screenshotDir: string; scriptId: string }>();

  const sharedHandlers: RunnerEventHandlers = {
    onLine(runId, line, timestamp) {
      const event: TestSuiteRunEvent = { type: 'output', runId, line, timestamp };
      for (const listener of runEventListeners) listener(event);
    },
    onComplete(runId, status, record) {
      // Index screenshots if a screenshot dir was configured for this run
      const ssMeta = runScreenshotDirs.get(runId);
      if (ssMeta) {
        screenshotStore.index({
          runId,
          scriptId: ssMeta.scriptId,
          screenshotDir: ssMeta.screenshotDir,
        });
        runScreenshotDirs.delete(runId);
      }

      const startedMs = new Date(record.startedAt).getTime();
      const completedMs = record.completedAt ? new Date(record.completedAt).getTime() : Date.now();
      const event: TestSuiteRunEvent = {
        type: 'complete',
        runId,
        status,
        report: {
          runId,
          scriptId: record.scriptId,
          status,
          totalSteps: record.outputLines.length,
          passedSteps: status === 'passed' ? record.outputLines.length : 0,
          failedSteps: status === 'failed' ? record.outputLines.length : 0,
          duration: completedMs - startedMs,
          screenshots: record.screenshots,
          outputLines: record.outputLines,
          startedAt: record.startedAt,
          completedAt: record.completedAt,
        },
      };
      for (const listener of runEventListeners) listener(event);
    },
  };

  const runner = createRunner(db);
  const configStore = createConfigStore(db);
  const analytics = createAnalytics(db);
  const fileWatcher = createFileWatcher();
  const baselineStore = createBaselineStore(db);
  const sharedStepsStore = createSharedStepsStore(db);
  const scheduler = createScheduler(db);

  const service: TestSuiteService = {
    // Sub-services
    scriptStore,
    runner,
    configStore,
    browserViewManager,
    screenshotStore,
    analytics,
    fileWatcher,
    baselineStore,
    sharedStepsStore,
    scheduler,
    getProjectPath: deps.getProjectPath,
    db,

    // Facade methods
    listScripts: () => Promise.resolve(scriptStore.list()),

    listScriptsByProject: (projectId) => Promise.resolve(scriptStore.listByProject(projectId)),

    getScript: (id) => Promise.resolve(scriptStore.get(id)),

    saveScript: (input) => {
      const config = configStore.getActive(input.projectId);
      return Promise.resolve(scriptStore.save({
        id: input.id,
        name: input.name,
        description: input.description,
        steps: input.steps,
        tags: input.tags,
        projectId: input.projectId,
        filePath: input.filePath ?? '',
        targetUrl: config?.targetUrl ?? '',
      }));
    },

    deleteScript: (id) => Promise.resolve(scriptStore.delete(id)),

    async runScript({ scriptId, triggeredBy, filePathOverride, baseUrlOverride }) {
      const script = scriptStore.get(scriptId);
      if (!script) {
        throw new Error(`Script not found: ${scriptId}`);
      }
      const projectPath = deps.getProjectPath(script.projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for projectId: ${script.projectId}`);
      }

      // Compute screenshot directory from config
      const config = configStore.getActive(script.projectId);
      const testDir = config?.testDirectory ?? 'tests/e2e';
      const screenshotMode = config?.screenshotMode ?? 'manual';
      const workers = config?.workers ?? 1;
      const retries = config?.retries ?? 1;
      let screenshotDir: string | undefined;

      if (screenshotMode !== 'manual') {
        const slug = script.name
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, '-')
          .replaceAll(/^-|-$/g, '');
        const dirName = `${slug}-screenshots`;
        screenshotDir = path.join(projectPath, testDir, 'screenshots', dirName);
      }

      // Pre-flight: verify target URL is reachable before spawning Playwright
      const targetUrl = baseUrlOverride ?? config?.targetUrl ?? script.targetUrl;
      if (targetUrl) {
        try {
          await fetch(targetUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        } catch {
          throw new Error(`Target URL is not reachable: ${targetUrl} — is your dev server running?`);
        }
      }

      // Data-driven runs pass their own spec file; normal runs always
      // regenerate so script-writer improvements take effect.
      let resolvedFilePath: string;
      if (filePathOverride) {
        resolvedFilePath = filePathOverride;
      } else {
        resolvedFilePath = writeSpecFile({
          projectRoot: projectPath,
          testDir,
          name: script.name,
          baseUrl: targetUrl || script.targetUrl,
          steps: script.steps as TestSuiteStep[],
          screenshotMode: config?.screenshotMode,
          navigationTimeout: config?.navigationTimeout,
          actionTimeout: config?.actionTimeout,
        });
        if (resolvedFilePath !== script.filePath) {
          scriptStore.save({ ...script, description: script.description ?? undefined, filePath: resolvedFilePath });
        }
      }

      // Regenerate playwright.config.ts to reflect current settings
      writePlaywrightConfig({
        projectRoot: projectPath,
        testDir,
        baseUrl: targetUrl || script.targetUrl,
        navigationTimeout: config?.navigationTimeout,
        actionTimeout: config?.actionTimeout,
        browsers: config?.browsers,
        workers,
        storageStatePath: config?.storageStatePath,
      });

      const runId = runner.run({
        scriptId,
        projectId: script.projectId,
        filePath: resolvedFilePath,
        projectPath,
        triggeredBy,
        screenshotDir,
        workers,
        retries,
        baseUrlOverride,
        handlers: sharedHandlers,
      });

      // Track screenshot dir for post-run indexing
      if (screenshotDir) {
        runScreenshotDirs.set(runId, { screenshotDir, scriptId });
      }

      return { runId };
    },

    getRun: (runId) => Promise.resolve(runner.get(runId) as QaRunIpcRecord | null),

    listRuns: ({ scriptId }) => Promise.resolve(runner.list(scriptId) as QaRunIpcRecord[]),

    exportFile({ runId }) {
      const run = runner.get(runId);
      if (!run) return Promise.reject(new Error(`Run not found: ${runId}`));
      const script = scriptStore.get(run.scriptId);
      if (!script) return Promise.reject(new Error(`Script not found for run ${runId}`));
      const projectPath = deps.getProjectPath(script.projectId) ?? process.cwd();
      const config = configStore.getActive(script.projectId);
      const testDir = config?.testDirectory ?? 'tests/e2e';
      const filePath = writeSpecFile({
        projectRoot: projectPath,
        testDir,
        name: script.name,
        baseUrl: script.targetUrl,
        steps: script.steps as TestSuiteStep[],
        screenshotMode: config?.screenshotMode,
        navigationTimeout: config?.navigationTimeout,
        actionTimeout: config?.actionTimeout,
      });
      return Promise.resolve({ filePath });
    },

    exportGithub() {
      return Promise.reject(new Error('GitHub export not implemented — configure GitHub integration first'));
    },

    attachRunToTask(runId, taskId) {
      db.update(testSuiteRuns)
        .set({ taskId })
        .where(eq(testSuiteRuns.id, runId))
        .run();
      return Promise.resolve({ success: true });
    },

    onRunEvent(listener) {
      runEventListeners.push(listener);
    },

    saveAuthState(projectId) {
      const projectPath = deps.getProjectPath(projectId);
      if (!projectPath) return Promise.reject(new Error(`Project path not found: ${projectId}`));
      const config = configStore.getActive(projectId);
      const testDir = config?.testDirectory ?? 'tests/e2e';
      const baseUrl = config?.targetUrl ?? 'http://localhost:3000';
      const statePath = path.join(projectPath, testDir, '.auth', 'state.json');

      mkdirSync(path.dirname(statePath), { recursive: true });

      const escapedStatePath = statePath.replaceAll('\\', '\\\\');
      const captureScript = `
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('${baseUrl}');
  await page.waitForTimeout(2000);
  await context.storageState({ path: '${escapedStatePath}' });
  await browser.close();
})();
`;
      const tmpScript = path.join(projectPath, testDir, '.auth', '_capture.js');
      writeFileSync(tmpScript, captureScript, 'utf8');
      try {
        execSync(`node "${tmpScript}"`, { cwd: projectPath, timeout: 30000 });
      } finally {
        try { unlinkSync(tmpScript); } catch { /* ignore */ }
      }

      if (config) {
        configStore.save(projectId, { ...config, storageStatePath: statePath, updatedAt: new Date().toISOString() });
      }

      return Promise.resolve({ storageStatePath: statePath });
    },

    clearAuthState(projectId) {
      const projectPath = deps.getProjectPath(projectId);
      if (!projectPath) return Promise.reject(new Error(`Project path not found: ${projectId}`));
      const config = configStore.getActive(projectId);
      if (config?.storageStatePath) {
        try { unlinkSync(config.storageStatePath); } catch { /* ignore */ }
        configStore.save(projectId, { ...config, storageStatePath: undefined, updatedAt: new Date().toISOString() });
      }
      return Promise.resolve({ success: true });
    },

    async batchRun({ scriptIds, triggeredBy, baseUrlOverride }) {
      const runIds: string[] = [];
      for (const scriptId of scriptIds) {
        try {
          const result = await service.runScript({ scriptId, triggeredBy, baseUrlOverride });
          runIds.push(result.runId);
        } catch {
          // Skip scripts that fail to start (missing project path, etc.)
        }
      }
      return { runIds, total: scriptIds.length };
    },
  };

  // Scheduler: fire runs for due schedules
  scheduler.start((schedule) => {
    void service
      .runScript({
        scriptId: schedule.scriptId,
        triggeredBy: 'scheduled',
      })
      .catch(() => {
        // Swallow — scheduler callback must not throw
      });
  });

  // Notification: surface scheduled run results to the OS
  service.onRunEvent((event) => {
    if (event.type !== 'complete' || event.status === undefined) return;
    const run = runner.get(event.runId);
    if (run?.triggeredBy !== 'scheduled') return;
    const script = scriptStore.get(run.scriptId);
    if (!script) return;
    sendTestNotification(script.name, event.status);
  });

  return service;
}
