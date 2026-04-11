/**
 * QA IPC Handlers
 *
 * Exposes QA operations (start quiet/full, get report, cancel) to the renderer.
 * Bridges QA session events to IPC events for real-time UI updates.
 */

import { QA, QA_EVENTS } from '@shared/ipc/qa/channels';


import type { BusSessionManager } from '@main/bus/session-manager';
import type { SessionRecord } from '@main/bus/types';

import { createThrottle } from '../../ipc/throttle';

import type { QaRunner } from './qa-types';
import type { IpcRouter } from '../../ipc/router';
import type { ProgressService } from '../progress/progress-service';

const UNKNOWN_TASK = 'Unknown task';

async function resolveTaskDescription(progressService: ProgressService, taskId: string): Promise<string> {
  try {
    const task = await progressService.getTask(taskId);
    if (task?.description && task.description.length > 0) return task.description;
    if (task?.title && task.title.length > 0) return task.title;
    return UNKNOWN_TASK;
  } catch {
    return UNKNOWN_TASK;
  }
}

export function registerQaHandlers(
  router: IpcRouter,
  qaRunner: QaRunner,
  busSessionManager: BusSessionManager,
  progressService: ProgressService,
): void {
  const allowFullQa = createThrottle(10000);

  // Wire QA session events to IPC events for the renderer
  qaRunner.onSessionEvent((event) => {
    if (event.type === 'started') {
      router.emit(QA_EVENTS.SESSION.STARTED, {
        taskId: event.session.taskId,
        mode: event.session.mode,
      });
    }

    if (event.type === 'progress' && event.step && event.total !== undefined && event.current !== undefined) {
      router.emit(QA_EVENTS.SESSION.PROGRESS, {
        taskId: event.session.taskId,
        step: event.step,
        total: event.total,
        current: event.current,
      });
    }

    if (event.type === 'completed') {
      router.emit(QA_EVENTS.SESSION.COMPLETED, {
        taskId: event.session.taskId,
        result: event.session.report?.result ?? 'fail',
        issueCount: event.session.report?.issues.length ?? 0,
      });
    }
  });

  router.handle(QA.START.QUIET, async ({ taskId }) => {
    const agentSession = busSessionManager.list({ taskSlug: taskId })[0] as SessionRecord | undefined;
    const agentSpawnCfg = agentSession?.spawnConfig as Record<string, unknown> | undefined;
    const projectPath = (agentSpawnCfg?.projectPath as string | undefined) ?? '';

    if (projectPath.length === 0) {
      throw new Error('No project path available for QA');
    }

    const taskDescription = await resolveTaskDescription(progressService, taskId);

    const session = await qaRunner.startQuiet(taskId, {
      projectPath,
      changedFiles: [],
      taskDescription,
    });

    return { sessionId: session.id };
  });

  router.handle(QA.START.FULL, async ({ taskId }) => {
    if (!allowFullQa()) {
      throw new Error('Too many requests. Please wait.');
    }

    const agentSession = busSessionManager.list({ taskSlug: taskId })[0] as SessionRecord | undefined;
    const agentSpawnCfg = agentSession?.spawnConfig as Record<string, unknown> | undefined;
    const projectPath = (agentSpawnCfg?.projectPath as string | undefined) ?? '';

    if (projectPath.length === 0) {
      throw new Error('No project path available for QA');
    }

    const taskDescription = await resolveTaskDescription(progressService, taskId);

    const session = await qaRunner.startFull(taskId, {
      projectPath,
      changedFiles: [],
      taskDescription,
    });

    return { sessionId: session.id };
  });

  router.handle(QA.GET.REPORT, ({ taskId }) => {
    const report = qaRunner.getReportForTask(taskId);
    return Promise.resolve(report ?? null);
  });

  router.handle(QA.GET.SESSION, ({ taskId }) => {
    const session = qaRunner.getSessionByTaskId(taskId);
    return Promise.resolve(session ?? null);
  });

  router.handle(QA.CANCEL.SESSION, ({ sessionId }) => {
    qaRunner.cancel(sessionId);
    return Promise.resolve({ success: true });
  });
}
