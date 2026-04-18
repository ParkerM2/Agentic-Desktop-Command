/**
 * QA Recorder Runner — Spawns Playwright via child_process.spawn
 *
 * Creates a QaRun record, spawns `npx playwright test` for the given
 * script file, streams stdout/stderr via event callbacks, then updates
 * the run record with final status and report.
 */

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { testSuiteRuns } from '../../db/schema';

import type { AdcDatabase } from '../../db';

export interface QaRunRecord {
  id: string;
  scriptId: string;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
  triggeredBy: 'manual' | 'scheduled' | 'ci' | 'auto-trigger';
  startedAt: string;
  completedAt?: string;
  outputLines: string[];
  screenshots: string[];
  error?: string;
}

export interface RunnerEventHandlers {
  onLine?: (runId: string, line: string, timestamp: string) => void;
  onComplete?: (runId: string, status: QaRunRecord['status'], record: QaRunRecord) => void;
}

export interface QaRunner {
  run: (params: {
    scriptId: string;
    projectId: string;
    filePath: string;
    projectPath: string;
    triggeredBy: 'manual' | 'scheduled' | 'ci' | 'auto-trigger';
    taskId?: string;
    screenshotDir?: string;
    handlers?: RunnerEventHandlers;
  }) => string;
  get: (runId: string) => QaRunRecord | null;
  list: (scriptId?: string) => QaRunRecord[];
  cancel: (runId: string) => void;
}

function toRunRecord(row: typeof testSuiteRuns.$inferSelect): QaRunRecord {
  interface ParsedOutput { outputLines?: string[]; screenshots?: string[]; error?: string }
  let parsed: ParsedOutput | null = null;
  try {
    parsed = row.output ? (JSON.parse(row.output) as ParsedOutput) : null;
  } catch {
    parsed = null;
  }
  return {
    id: row.id,
    scriptId: row.scriptId,
    status: row.status as QaRunRecord['status'],
    triggeredBy: row.triggeredBy as QaRunRecord['triggeredBy'],
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
    outputLines: parsed?.outputLines ?? [],
    screenshots: parsed?.screenshots ?? [],
    error: parsed?.error,
  };
}

export function createRunner(db: AdcDatabase): QaRunner {
  const activeProcesses = new Map<string, ReturnType<typeof spawn>>();

  return {
    run({ scriptId, projectId, filePath, projectPath, triggeredBy, taskId, screenshotDir, handlers }) {
      const runId = nanoid();
      const now = new Date().toISOString();

      db.insert(testSuiteRuns).values({
        id: runId,
        scriptId,
        projectId,
        status: 'running',
        triggeredBy,
        durationMs: 0,
        stepsPassed: 0,
        stepsFailed: 0,
        output: null,
        startedAt: now,
        completedAt: null,
        taskId: taskId ?? null,
        sessionId: null,
        report: null,
      }).run();

      const outputLines: string[] = [];
      const screenshots: string[] = [];

      if (screenshotDir) {
        mkdirSync(screenshotDir, { recursive: true });
      }

      const child = spawn('npx', ['playwright', 'test', filePath, '--reporter=line'], {
        cwd: projectPath,
        shell: process.platform === 'win32',
        env: { ...process.env, ...(screenshotDir ? { SCREENSHOT_DIR: screenshotDir } : {}) },
      });

      activeProcesses.set(runId, child);

      function emitLine(line: string): void {
        const timestamp = new Date().toISOString();
        outputLines.push(line);
        handlers?.onLine?.(runId, line, timestamp);
      }

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        for (const line of text.split('\n')) {
          if (line.trim()) emitLine(line);
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        for (const line of text.split('\n')) {
          if (line.trim()) emitLine(line);
        }
      });

      child.on('close', (code) => {
        activeProcesses.delete(runId);
        const completedAt = new Date().toISOString();
        const status: QaRunRecord['status'] = code === 0 ? 'passed' : 'failed';

        const startMs = new Date(now).getTime();
        const endMs = new Date(completedAt).getTime();
        const output = JSON.stringify({ outputLines, screenshots });
        db.update(testSuiteRuns).set({
          status,
          completedAt,
          durationMs: endMs - startMs,
          output,
        }).where(eq(testSuiteRuns.id, runId)).run();

        const record: QaRunRecord = {
          id: runId,
          scriptId,
          status,
          triggeredBy,
          startedAt: now,
          completedAt,
          outputLines,
          screenshots,
        };

        handlers?.onComplete?.(runId, status, record);
      });

      child.on('error', (err) => {
        activeProcesses.delete(runId);
        const completedAt = new Date().toISOString();
        const startMs = new Date(now).getTime();
        const endMs = new Date(completedAt).getTime();
        const output = JSON.stringify({ outputLines, screenshots, error: err.message });

        db.update(testSuiteRuns).set({
          status: 'failed',
          completedAt,
          durationMs: endMs - startMs,
          output,
        }).where(eq(testSuiteRuns.id, runId)).run();

        const record: QaRunRecord = {
          id: runId,
          scriptId,
          status: 'failed',
          triggeredBy,
          startedAt: now,
          completedAt,
          outputLines,
          screenshots,
          error: err.message,
        };

        handlers?.onComplete?.(runId, 'failed', record);
      });

      return runId;
    },

    get(runId) {
      const rows = db.select().from(testSuiteRuns).where(eq(testSuiteRuns.id, runId)).all();
      const row = rows.at(0);
      return row ? toRunRecord(row) : null;
    },

    list(scriptId) {
      const rows = scriptId
        ? db.select().from(testSuiteRuns).where(eq(testSuiteRuns.scriptId, scriptId)).orderBy(desc(testSuiteRuns.startedAt)).all()
        : db.select().from(testSuiteRuns).orderBy(desc(testSuiteRuns.startedAt)).all();
      return rows.map(toRunRecord);
    },

    cancel(runId) {
      const child = activeProcesses.get(runId);
      if (child) {
        child.kill();
        activeProcesses.delete(runId);
      }
      db.update(testSuiteRuns).set({
        status: 'cancelled',
        completedAt: new Date().toISOString(),
      }).where(eq(testSuiteRuns.id, runId)).run();
    },
  };
}
