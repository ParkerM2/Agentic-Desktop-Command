/**
 * QA Auto-Trigger
 *
 * Listens for task status changes and automatically starts quiet QA
 * when a task transitions to 'review' status. Guards against re-triggering
 * if QA is already running for the task.
 */

import { readFileSync } from 'node:fs';

import type { QaContext, QaRunner } from './qa-types';
import type { IpcRouter } from '../../ipc/router';
import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { HubApiClient } from '../hub/hub-api-client';

export interface QaTrigger {
  dispose: () => void;
}

function extractChangedFiles(orchestrator: AgentOrchestrator, taskId: string): string[] {
  const session = orchestrator.getSessionByTaskId(taskId);
  if (!session) {
    return [];
  }

  try {
    const content = readFileSync(session.progressFile, 'utf-8');
    const files = new Set<string>();

    for (const line of content.split('\n')) {
      if (line.trim().length === 0) {
        continue;
      }
      try {
        const entry = JSON.parse(line) as Record<string, unknown>;
        if (entry.type === 'tool_use' && typeof entry.file === 'string') {
          files.add(entry.file);
        }
      } catch {
        // Skip unparseable lines
      }
    }

    return [...files];
  } catch {
    return [];
  }
}

function getTaskDescription(task: { title: string; description: string }): string {
  if (task.description.length > 0) {
    return task.description;
  }
  if (task.title.length > 0) {
    return task.title;
  }
  return 'Unknown task';
}

export function createQaTrigger(deps: {
  qaRunner: QaRunner;
  orchestrator: AgentOrchestrator;
  hubApiClient: HubApiClient;
  router: IpcRouter;
}): QaTrigger {
  const { qaRunner, orchestrator, hubApiClient } = deps;
  const triggeredTasks = new Set<string>();

  function isQaAlreadyRunning(taskId: string): boolean {
    const existingSession = qaRunner.getSessionByTaskId(taskId);
    if (!existingSession) {
      return false;
    }
    return (
      existingSession.status === 'building' ||
      existingSession.status === 'launching' ||
      existingSession.status === 'testing'
    );
  }

  async function handleTaskReview(taskId: string): Promise<void> {
    if (triggeredTasks.has(taskId) || isQaAlreadyRunning(taskId)) {
      return;
    }

    triggeredTasks.add(taskId);

    try {
      const taskResult = await hubApiClient.getTask(taskId);
      if (!taskResult.ok || !taskResult.data) {
        console.warn(`[QaTrigger] Task ${taskId} not found, skipping QA`);
        return;
      }

      const task = taskResult.data;

      // Determine project path from agent session
      const agentSession = orchestrator.getSessionByTaskId(taskId);
      const projectPath = agentSession?.projectPath ?? '';

      if (projectPath.length === 0) {
        console.warn(`[QaTrigger] No project path for task ${taskId}, skipping QA`);
        return;
      }

      const changedFiles = extractChangedFiles(orchestrator, taskId);

      const context: QaContext = {
        projectPath,
        changedFiles,
        taskDescription: getTaskDescription(task),
      };

      await qaRunner.startQuiet(taskId, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[QaTrigger] Failed to start QA for task ${taskId}:`, message);
      triggeredTasks.delete(taskId);
    }
  }

  // Listen for task completion events from the orchestrator
  orchestrator.onSessionEvent((event) => {
    if (event.type !== 'completed' || event.session.phase !== 'executing') {
      return;
    }

    // When an execution agent completes, the task may move to review
    // Give it a moment for status to propagate, then check
    const { taskId } = event.session;
    setTimeout(() => {
      void (async () => {
        try {
          const taskResult = await hubApiClient.getTask(taskId);
          if (taskResult.ok && taskResult.data) {
            const task = taskResult.data;
            if (task.status === 'review') {
              await handleTaskReview(taskId);
            }
          }
        } catch {
          // Silently skip — task fetch may fail
        }
      })();
    }, 2000);
  });

  return {
    dispose(): void {
      triggeredTasks.clear();
    },
  };
}
