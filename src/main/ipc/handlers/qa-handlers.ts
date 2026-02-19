/**
 * QA IPC Handlers
 *
 * Exposes QA operations (start quiet/full, get report, cancel) to the renderer.
 * Bridges QA session events to IPC events for real-time UI updates.
 */

import type { AgentOrchestrator } from '../../services/agent-orchestrator/types';
import type { QaRunner } from '../../services/qa/qa-types';
import type { TaskRepository } from '../../services/tasks/types';
import type { IpcRouter } from '../router';

const UNKNOWN_TASK = 'Unknown task';

function extractDescription(data: Record<string, unknown>): string {
  if (typeof data.description === 'string' && data.description.length > 0) {
    return data.description;
  }
  if (typeof data.title === 'string' && data.title.length > 0) {
    return data.title;
  }
  return UNKNOWN_TASK;
}

async function resolveTaskDescription(taskRepository: TaskRepository, taskId: string): Promise<string> {
  try {
    const task = await taskRepository.getTask(taskId);
    return extractDescription(task as unknown as Record<string, unknown>);
  } catch {
    return UNKNOWN_TASK;
  }
}

export function registerQaHandlers(
  router: IpcRouter,
  qaRunner: QaRunner,
  orchestrator: AgentOrchestrator,
  taskRepository: TaskRepository,
): void {
  // Wire QA session events to IPC events for the renderer
  qaRunner.onSessionEvent((event) => {
    if (event.type === 'started') {
      router.emit('event:qa.started', {
        taskId: event.session.taskId,
        mode: event.session.mode,
      });
    }

    if (event.type === 'progress' && event.step && event.total !== undefined && event.current !== undefined) {
      router.emit('event:qa.progress', {
        taskId: event.session.taskId,
        step: event.step,
        total: event.total,
        current: event.current,
      });
    }

    if (event.type === 'completed') {
      router.emit('event:qa.completed', {
        taskId: event.session.taskId,
        result: event.session.report?.result ?? 'fail',
        issueCount: event.session.report?.issues.length ?? 0,
      });
    }
  });

  router.handle('qa.startQuiet', async ({ taskId }) => {
    const agentSession = orchestrator.getSessionByTaskId(taskId);
    const projectPath = agentSession?.projectPath ?? '';

    if (projectPath.length === 0) {
      throw new Error('No project path available for QA');
    }

    const taskDescription = await resolveTaskDescription(taskRepository, taskId);

    const session = await qaRunner.startQuiet(taskId, {
      projectPath,
      changedFiles: [],
      taskDescription,
    });

    return { sessionId: session.id };
  });

  router.handle('qa.startFull', async ({ taskId }) => {
    const agentSession = orchestrator.getSessionByTaskId(taskId);
    const projectPath = agentSession?.projectPath ?? '';

    if (projectPath.length === 0) {
      throw new Error('No project path available for QA');
    }

    const taskDescription = await resolveTaskDescription(taskRepository, taskId);

    const session = await qaRunner.startFull(taskId, {
      projectPath,
      changedFiles: [],
      taskDescription,
    });

    return { sessionId: session.id };
  });

  router.handle('qa.getReport', ({ taskId }) => {
    const report = qaRunner.getReportForTask(taskId);
    return Promise.resolve(report ?? null);
  });

  router.handle('qa.getSession', ({ taskId }) => {
    const session = qaRunner.getSessionByTaskId(taskId);
    return Promise.resolve(session ?? null);
  });

  router.handle('qa.cancel', ({ sessionId }) => {
    qaRunner.cancel(sessionId);
    return Promise.resolve({ success: true });
  });
}
