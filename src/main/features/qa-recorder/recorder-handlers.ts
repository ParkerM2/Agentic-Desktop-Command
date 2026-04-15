/**
 * QA Recorder IPC Handlers
 *
 * Bridges qa-recorder service to the renderer via IPC.
 * Thin handlers — all logic delegated to service.
 */

import { QA_RECORDER, QA_RECORDER_EVENTS } from '@shared/ipc/qa-recorder/channels';
import type {
  QaRunReportSchema,
  QaRunSchema,
  QaRunStatusSchema,
  QaScriptSchema,
  QaRecorderStepSchema,
} from '@shared/ipc/qa-recorder/schemas';

import type { IpcRouter } from '../../ipc/router';

// ─── Locally-inferred types from shared schemas ────────────────
// These use `infer` to avoid importing zod directly in main/.

type InferZodType<T extends { _output: unknown }> = T['_output'];

type QaScript = InferZodType<typeof QaScriptSchema>;
type QaRun = InferZodType<typeof QaRunSchema>;
type QaRunStatus = InferZodType<typeof QaRunStatusSchema>;
type QaRunReport = InferZodType<typeof QaRunReportSchema>;
type QaRecorderStep = InferZodType<typeof QaRecorderStepSchema>;

// ─── Service Interface ─────────────────────────────────────────
// Defined locally until Task #34 merges.

export interface QaRecorderRunEvent {
  type: 'output' | 'screenshot' | 'complete';
  runId: string;
  line?: string;
  timestamp?: string;
  screenshotPath?: string;
  stepIndex?: number;
  status?: QaRunStatus;
  report?: QaRunReport;
}

export interface QaRecorderService {
  listScripts: () => Promise<QaScript[]>;
  getScript: (id: string) => Promise<QaScript | null>;
  saveScript: (input: {
    id?: string;
    name: string;
    description?: string;
    steps: QaRecorderStep[];
  }) => Promise<QaScript>;
  deleteScript: (id: string) => Promise<{ success: boolean }>;
  runScript: (input: { scriptId: string; triggeredBy: 'manual' | 'scheduled' | 'ci' }) => Promise<{ runId: string }>;
  getRun: (runId: string) => Promise<QaRun | null>;
  listRuns: (input: { scriptId?: string }) => Promise<QaRun[]>;
  exportFile: (input: { runId: string; format: 'json' | 'html' | 'csv' }) => Promise<{ filePath: string }>;
  exportGithub: (input: { runId: string; owner: string; repo: string }) => Promise<{ issueUrl: string }>;
  onRunEvent: (listener: (event: QaRecorderRunEvent) => void) => void;
}

// ─── Handler Registration ──────────────────────────────────────

export function registerQaRecorderHandlers(
  router: IpcRouter,
  qaRecorderService: QaRecorderService,
): void {
  // ── Event forwarding ──────────────────────────────────────────

  qaRecorderService.onRunEvent((event) => {
    if (event.type === 'output' && event.line !== undefined && event.timestamp !== undefined) {
      router.emit(QA_RECORDER_EVENTS.OUTPUT.LINE, {
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
      router.emit(QA_RECORDER_EVENTS.RUN.SCREENSHOT, {
        runId: event.runId,
        screenshotPath: event.screenshotPath,
        stepIndex: event.stepIndex,
        timestamp: event.timestamp,
      });
    }

    if (event.type === 'complete' && event.status !== undefined && event.report !== undefined) {
      router.emit(QA_RECORDER_EVENTS.RUN.COMPLETE, {
        runId: event.runId,
        status: event.status,
        report: event.report,
      });
    }
  });

  // ── Invoke handlers ───────────────────────────────────────────

  router.handle(QA_RECORDER.LIST.SCRIPTS, () =>
    qaRecorderService.listScripts(),
  );

  router.handle(QA_RECORDER.GET.SCRIPT, ({ id }) =>
    qaRecorderService.getScript(id),
  );

  router.handle(QA_RECORDER.SAVE.SCRIPT, (input) =>
    qaRecorderService.saveScript(input),
  );

  router.handle(QA_RECORDER.DELETE.SCRIPT, ({ id }) =>
    qaRecorderService.deleteScript(id),
  );

  router.handle(QA_RECORDER.RUN.SCRIPT, (input) =>
    qaRecorderService.runScript(input),
  );

  router.handle(QA_RECORDER.GET.RUN, ({ runId }) =>
    qaRecorderService.getRun(runId),
  );

  router.handle(QA_RECORDER.LIST.RUNS, (input) =>
    qaRecorderService.listRuns(input),
  );

  router.handle(QA_RECORDER.EXPORT.FILE, (input) =>
    qaRecorderService.exportFile(input),
  );

  router.handle(QA_RECORDER.EXPORT.GITHUB, (input) =>
    qaRecorderService.exportGithub(input),
  );
}
