/**
 * Test Suite Service — Factory
 *
 * Composes script store, runner, and exporter into a single facade that
 * satisfies the IPC handler interface expected by recorder-handlers.ts.
 */

import type { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';

import { createExporter } from './exporter';
import { createRunner } from './runner';
import { createScriptStore } from './script-store';

import type { QaExporter } from './exporter';
import type { QaRunner, QaRunRecord, RunnerEventHandlers } from './runner';
import type { ScriptStore, QaScript } from './script-store';
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

// ─── Facade interface (satisfies recorder-handlers.ts) ────────

export interface TestSuiteService {
  // Sub-services (used by qa-trigger.ts and other internal consumers)
  scriptStore: ScriptStore;
  runner: QaRunner;
  exporter: QaExporter;

  // Async facade methods (used by IPC handler layer)
  listScripts: () => Promise<QaScript[]>;
  getScript: (id: string) => Promise<QaScript | null>;
  saveScript: (input: {
    id?: string;
    name: string;
    description?: string;
    steps: TestSuiteStep[];
  }) => Promise<QaScript>;
  deleteScript: (id: string) => Promise<{ success: boolean }>;
  runScript: (input: {
    scriptId: string;
    triggeredBy: 'manual' | 'scheduled' | 'ci';
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
  onRunEvent: (listener: (event: TestSuiteRunEvent) => void) => void;
}

export function createTestSuiteService(db: AdcDatabase): TestSuiteService {
  const scriptStore = createScriptStore(db);
  const runEventListeners: Array<(event: TestSuiteRunEvent) => void> = [];

  const sharedHandlers: RunnerEventHandlers = {
    onLine(runId, line, timestamp) {
      const event: TestSuiteRunEvent = { type: 'output', runId, line, timestamp };
      for (const listener of runEventListeners) listener(event);
    },
    onComplete(runId, status, record) {
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
  const exporter = createExporter();

  return {
    // Sub-services
    scriptStore,
    runner,
    exporter,

    // Facade methods
    listScripts: () => Promise.resolve(scriptStore.list()),

    getScript: (id) => Promise.resolve(scriptStore.get(id)),

    saveScript: (input) => Promise.resolve(scriptStore.save({
      id: input.id,
      name: input.name,
      projectId: '',
      filePath: '',
      targetUrl: '',
    })),

    deleteScript: (id) => Promise.resolve(scriptStore.delete(id)),

    runScript({ scriptId, triggeredBy }) {
      const script = scriptStore.get(scriptId);
      if (!script) {
        return Promise.reject(new Error(`Script not found: ${scriptId}`));
      }
      const projectPath = script.projectId;
      const runId = runner.run({
        scriptId,
        filePath: script.filePath,
        projectPath,
        triggeredBy,
        handlers: sharedHandlers,
      });
      return Promise.resolve({ runId });
    },

    getRun: (runId) => Promise.resolve(runner.get(runId) as QaRunIpcRecord | null),

    listRuns: ({ scriptId }) => Promise.resolve(runner.list(scriptId) as QaRunIpcRecord[]),

    exportFile({ runId }) {
      const run = runner.get(runId);
      if (!run) return Promise.reject(new Error(`Run not found: ${runId}`));
      const script = scriptStore.get(run.scriptId);
      if (!script) return Promise.reject(new Error(`Script not found for run ${runId}`));
      const projectPath = script.projectId || process.cwd();
      const result = exporter.export({
        scriptId: script.id,
        scriptName: script.name,
        baseUrl: script.targetUrl,
        steps: [],
        projectPath,
      });
      return Promise.resolve({ filePath: result.filePath });
    },

    exportGithub() {
      return Promise.reject(new Error('GitHub export not implemented — configure GitHub integration first'));
    },

    onRunEvent(listener) {
      runEventListeners.push(listener);
    },
  };
}
