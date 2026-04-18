/**
 * QA Recorder Runner — Spawns Playwright via child_process.spawn
 *
 * Creates a QaRun record, spawns `npx playwright test` for the given
 * script file, streams stdout/stderr via event callbacks, then updates
 * the run record with final status and report.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

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
  stepsPassed: number;
  stepsFailed: number;
  durationMs: number;
  reportPath?: string;
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
    workers?: number;
    retries?: number;
    baseUrlOverride?: string;
    handlers?: RunnerEventHandlers;
  }) => string;
  get: (runId: string) => QaRunRecord | null;
  list: (scriptId?: string) => QaRunRecord[];
  cancel: (runId: string) => void;
}

function toRunRecord(row: typeof testSuiteRuns.$inferSelect): QaRunRecord {
  interface ParsedOutput { outputLines?: string[]; screenshots?: string[]; error?: string; reportPath?: string }
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
    stepsPassed: row.stepsPassed,
    stepsFailed: row.stepsFailed,
    durationMs: row.durationMs,
    reportPath: parsed?.reportPath,
  };
}

interface PreflightResult {
  ok: boolean;
  errors: string[];
}

function preflight(filePath: string, projectPath: string): PreflightResult {
  const errors: string[] = [];

  // 1. Check spec file exists (may be absolute or relative to projectPath)
  const absolutePath = filePath ? join(projectPath, filePath) : '';
  if (!filePath || (!existsSync(absolutePath) && !existsSync(filePath))) {
    errors.push(`Spec file not found: ${filePath || '(empty path)'}`);
  }

  // 2. Check Playwright is installed in the project
  const pwPath = join(projectPath, 'node_modules', '@playwright', 'test');
  if (!existsSync(pwPath)) {
    errors.push('Playwright is not installed. Run: npm install -D @playwright/test');
  }

  // 3. Best-effort check for Playwright browsers
  const homeDir = process.env.USERPROFILE ?? process.env.HOME ?? '';
  const globalCacheDir = join(homeDir, '.cache', 'ms-playwright');
  const localCacheDir = join(projectPath, 'node_modules', '.cache', 'ms-playwright');
  if (!existsSync(globalCacheDir) && !existsSync(localCacheDir)) {
    errors.push('Playwright browsers may not be installed. Run: npx playwright install');
  }

  return { ok: errors.length === 0, errors };
}

export function createRunner(db: AdcDatabase): QaRunner {
  const activeProcesses = new Map<string, ReturnType<typeof spawn>>();

  return {
    run({ scriptId, projectId, filePath, projectPath, triggeredBy, taskId, screenshotDir, workers, retries, baseUrlOverride, handlers }) {
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

      // ── Pre-flight checks ──────────────────────────────────
      const check = preflight(filePath, projectPath);
      if (!check.ok) {
        const completedAt = new Date().toISOString();
        const output = JSON.stringify({
          outputLines: check.errors,
          screenshots: [],
          error: check.errors.join('; '),
        });

        db.update(testSuiteRuns).set({
          status: 'failed',
          completedAt,
          durationMs: 0,
          stepsFailed: check.errors.length,
          output,
        }).where(eq(testSuiteRuns.id, runId)).run();

        const record: QaRunRecord = {
          id: runId,
          scriptId,
          status: 'failed',
          triggeredBy,
          startedAt: now,
          completedAt,
          outputLines: check.errors,
          screenshots: [],
          error: check.errors.join('; '),
          stepsPassed: 0,
          stepsFailed: check.errors.length,
          durationMs: 0,
        };

        handlers?.onComplete?.(runId, 'failed', record);
        return runId;
      }

      const outputLines: string[] = [];
      const screenshots: string[] = [];

      if (screenshotDir) {
        mkdirSync(screenshotDir, { recursive: true });
      }

      const numWorkers = workers ?? 1;
      const retryCount = retries ?? 1;
      const reportDir = join(projectPath, '.playwright-reports', runId);
      const args = ['playwright', 'test', filePath, '--reporter=json,html', '--screenshot=only-on-failure', `--retries=${retryCount}`, `--workers=${numWorkers}`];
      const child = spawn('npx', args, {
        cwd: projectPath,
        shell: process.platform === 'win32',
        env: { ...process.env, PLAYWRIGHT_HTML_REPORT: reportDir, ...(screenshotDir ? { SCREENSHOT_DIR: screenshotDir } : {}), ...(baseUrlOverride ? { BASE_URL: baseUrlOverride } : {}) },
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

        // ── Parse JSON reporter output for step-level counts ──
        let stepsPassed = 0;
        let stepsFailed = 0;
        const fullOutput = outputLines.join('\n');
        try {
          const jsonResult = JSON.parse(fullOutput) as {
            stats?: { expected?: number; unexpected?: number; flaky?: number };
          };
          if (jsonResult.stats) {
            stepsPassed = jsonResult.stats.expected ?? 0;
            stepsFailed = (jsonResult.stats.unexpected ?? 0) + (jsonResult.stats.flaky ?? 0);
          }
        } catch {
          // JSON parse failed — Playwright may have crashed or produced non-JSON output
          stepsPassed = code === 0 ? 1 : 0;
          stepsFailed = code === 0 ? 0 : 1;
        }

        const reportPath = join(projectPath, '.playwright-reports', runId, 'index.html');
        const output = JSON.stringify({ outputLines, screenshots, reportPath });
        db.update(testSuiteRuns).set({
          status,
          completedAt,
          durationMs: endMs - startMs,
          stepsPassed,
          stepsFailed,
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
          stepsPassed,
          stepsFailed,
          durationMs: endMs - startMs,
          reportPath,
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
          stepsFailed: 1,
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
          stepsPassed: 0,
          stepsFailed: 1,
          durationMs: endMs - startMs,
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
