/**
 * QA Auto-Trigger
 *
 * Listens for task status changes and automatically starts quiet QA
 * when a task transitions to 'review' status. Guards against re-triggering
 * if QA is already running for the task.
 */

import { readFileSync } from 'node:fs';


import type { BusSessionManager } from '@main/bus/session-manager';
import type { SessionRecord } from '@main/bus/types';
import { serviceLogger } from '@main/lib/logger';

import type { QaContext, QaRunner } from './qa-types';
import type { QaRecorderService } from './recorder';
import type { IpcRouter } from '../../ipc/router';
import type { TaskRepository } from '../tasks/types';

export interface QaTrigger {
  dispose: () => void;
}

function extractChangedFiles(busSessionManager: BusSessionManager, taskId: string): string[] {
  const session = busSessionManager.list({ taskSlug: taskId })[0] as SessionRecord | undefined;
  if (!session) {
    return [];
  }

  const spawnCfg = session.spawnConfig as Record<string, unknown>;
  const progressFile = (spawnCfg.progressFile as string | undefined) ?? '';
  if (!progressFile) return [];

  try {
    const content = readFileSync(progressFile, 'utf-8');
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
  busSessionManager: BusSessionManager;
  taskRepository: TaskRepository;
  router: IpcRouter;
  qaRecorderService?: QaRecorderService;
}): QaTrigger {
  const { qaRunner, busSessionManager, taskRepository, qaRecorderService } = deps;
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
      let task;
      try {
        task = await taskRepository.getTask(taskId);
      } catch {
        serviceLogger.warn(`[QaTrigger] Task ${taskId} not found, skipping QA`);
        return;
      }

      // Determine project path from agent session
      const agentSession = busSessionManager.list({ taskSlug: taskId })[0] as SessionRecord | undefined;
      const agentSpawnCfg = agentSession?.spawnConfig as Record<string, unknown> | undefined;
      const projectPath = (agentSpawnCfg?.projectPath as string | undefined) ?? '';

      if (projectPath.length === 0) {
        serviceLogger.warn(`[QaTrigger] No project path for task ${taskId}, skipping QA`);
        return;
      }

      const changedFiles = extractChangedFiles(busSessionManager, taskId);

      const context: QaContext = {
        projectPath,
        changedFiles,
        taskDescription: getTaskDescription(task),
      };

      await qaRunner.startQuiet(taskId, context);

      // Fire recorded scripts for this project in parallel with agent QA
      if (qaRecorderService) {
        const scripts = qaRecorderService.scriptStore.listByProject(projectPath);
        for (const script of scripts) {
          if (!script.filePath) continue;
          try {
            qaRecorderService.runner.run({
              scriptId: script.id,
              filePath: script.filePath,
              projectPath,
              triggeredBy: 'auto-trigger',
              taskId,
            });
          } catch (scriptError) {
            const msg = scriptError instanceof Error ? scriptError.message : 'Unknown error';
            serviceLogger.error(`[QaTrigger] Failed to run script ${script.id} for task ${taskId}:`, msg);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      serviceLogger.error(`[QaTrigger] Failed to start QA for task ${taskId}:`, message);
      triggeredTasks.delete(taskId);
    }
  }

  // Listen for task completion events from the bus session manager
  busSessionManager.onEvent((event) => {
    if (event.type !== 'completed' || event.session.phase !== 'executing') {
      return;
    }

    // When an execution agent completes, the task may move to review
    // Give it a moment for status to propagate, then check
    const taskId = event.session.taskSlug;
    if (!taskId) return;
    setTimeout(() => {
      void (async () => {
        try {
          const task = await taskRepository.getTask(taskId);
          if (task.status === 'review') {
            await handleTaskReview(taskId);
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
