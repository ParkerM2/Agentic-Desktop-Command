/**
 * QA Recorder Runner — Spawns Playwright via child_process.spawn
 *
 * Creates a QaRun record, spawns `npx playwright test` for the given
 * script file, streams stdout/stderr via event callbacks, then updates
 * the run record with final status and report.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { qaRuns } from '../../../db/schema';

import type { AdcDatabase } from '../../../db';

export interface QaRunRecord {
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

export interface RunnerEventHandlers {
  onLine?: (runId: string, line: string, timestamp: string) => void;
  onComplete?: (runId: string, status: QaRunRecord['status'], record: QaRunRecord) => void;
}

export interface QaRunner {
  run: (params: {
    scriptId: string;
    filePath: string;
    projectPath: string;
    triggeredBy: 'manual' | 'scheduled' | 'ci';
    handlers?: RunnerEventHandlers;
  }) => string;
  get: (runId: string) => QaRunRecord | null;
  list: (scriptId?: string) => QaRunRecord[];
  cancel: (runId: string) => void;
}

function toRunRecord(row: typeof qaRuns.$inferSelect): QaRunRecord {
  const report = row.report as { outputLines?: string[]; screenshots?: string[]; error?: string } | null;
  return {
    id: row.id,
    scriptId: row.scriptId,
    status: row.status as QaRunRecord['status'],
    triggeredBy: row.triggeredBy as QaRunRecord['triggeredBy'],
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
    outputLines: report?.outputLines ?? [],
    screenshots: report?.screenshots ?? [],
    error: report?.error,
  };
}

export function createRunner(db: AdcDatabase): QaRunner {
  const activeProcesses = new Map<string, ReturnType<typeof spawn>>();

  return {
    run({ scriptId, filePath, projectPath, triggeredBy, handlers }) {
      const runId = randomUUID();
      const now = new Date().toISOString();

      db.insert(qaRuns).values({
        id: runId,
        scriptId,
        projectId: projectPath,
        taskId: null,
        sessionId: null,
        status: 'running',
        triggeredBy,
        report: null,
        startedAt: now,
        completedAt: null,
      }).run();

      const outputLines: string[] = [];
      const screenshots: string[] = [];

      const child = spawn('npx', ['playwright', 'test', filePath, '--reporter=line'], {
        cwd: projectPath,
        shell: false,
        env: { ...process.env },
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

        const report = { outputLines, screenshots };
        db.update(qaRuns).set({
          status,
          completedAt,
          report,
        }).where(eq(qaRuns.id, runId)).run();

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
        const report = { outputLines, screenshots, error: err.message };

        db.update(qaRuns).set({
          status: 'failed',
          completedAt,
          report,
        }).where(eq(qaRuns.id, runId)).run();

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
      const rows = db.select().from(qaRuns).where(eq(qaRuns.id, runId)).all();
      const row = rows.at(0);
      return row ? toRunRecord(row) : null;
    },

    list(scriptId) {
      const rows = scriptId
        ? db.select().from(qaRuns).where(eq(qaRuns.scriptId, scriptId)).all()
        : db.select().from(qaRuns).all();
      return rows.map(toRunRecord);
    },

    cancel(runId) {
      const child = activeProcesses.get(runId);
      if (child) {
        child.kill();
        activeProcesses.delete(runId);
      }
      db.update(qaRuns).set({
        status: 'cancelled',
        completedAt: new Date().toISOString(),
      }).where(eq(qaRuns.id, runId)).run();
    },
  };
}
