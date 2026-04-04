/**
 * Workflow IPC handlers
 *
 * Manages progress watching for project directories and task launching.
 * Uses the JSONL-based watcher for milestone/context/permission push events,
 * plus the legacy markdown watcher (via progress-syncer) for Hub sync.
 * Launches Claude CLI sessions for task execution.
 */

import { createJsonlWatcher } from '../../services/workflow/jsonl-watcher';
import { createProgressSyncer } from '../../services/workflow/progress-syncer';
import { createProgressWatcher } from '../../services/workflow/progress-watcher';

import type { HubApiClient } from '../../services/hub/hub-api-client';
import type { JsonlWatcher } from '../../services/workflow/jsonl-watcher';
import type { ProgressWatcher } from '../../services/workflow/progress-watcher';
import type { TaskLauncherService } from '../../services/workflow/task-launcher';
import type { IpcRouter } from '../router';

interface ActiveWatcher {
  jsonl: JsonlWatcher;
  legacy: ProgressWatcher;
}

/** Active watcher pairs keyed by project path. */
const activeWatchers = new Map<string, ActiveWatcher>();

export function registerWorkflowHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
  taskLauncher: TaskLauncherService,
): void {
  router.handle('workflow.watchProgress', ({ projectPath }) => {
    // Stop existing watchers for this path if any
    const existing = activeWatchers.get(projectPath);
    if (existing) {
      existing.jsonl.stop();
      existing.legacy.stop();
      activeWatchers.delete(projectPath);
    }

    // ── Legacy markdown watcher for Hub progress sync ──
    const legacyWatcher = createProgressWatcher(projectPath);
    const syncer = createProgressSyncer(hubApiClient);
    legacyWatcher.onProgress((data) => {
      void syncer.syncProgress(data.taskId, data);
    });
    legacyWatcher.onProgress((data) => {
      router.emit('event:task.progressUpdated', {
        taskId: data.taskId,
        progress: {
          phase: data.phase as 'idle' | 'planning' | 'coding' | 'testing' | 'reviewing' | 'complete' | 'error',
          phaseProgress: data.totalPhases > 0 ? Math.round((data.phaseIndex / data.totalPhases) * 100) : 0,
          overallProgress: data.totalPhases > 0 ? Math.round((data.phaseIndex / data.totalPhases) * 100) : 0,
          message: `Phase: ${data.phase}`,
        },
      });
    });
    legacyWatcher.start();

    // ── New JSONL watcher for milestone/context/permission events ──
    const jsonlWatcher = createJsonlWatcher(projectPath);

    jsonlWatcher.onMilestone((event) => {
      router.emit('event:workflow.milestone', {
        ticket: event.ticket,
        run: event.run,
        event: event.event,
        agent: event.agent,
        ts: event.ts,
        data: event.data,
      });
    });

    jsonlWatcher.onContext((ctx) => {
      router.emit('event:workflow.context', {
        ticket: ctx?.ticket ?? null,
        phase: ctx?.phase ?? null,
        runSlug: ctx?.runSlug ?? null,
      });
    });

    jsonlWatcher.onPermission((ticket, agent, message) => {
      router.emit('event:workflow.permission', { ticket, agent, message });
    });

    jsonlWatcher.start();
    activeWatchers.set(projectPath, { jsonl: jsonlWatcher, legacy: legacyWatcher });

    return Promise.resolve({ success: true });
  });

  router.handle('workflow.stopWatching', ({ projectPath }) => {
    const watcher = activeWatchers.get(projectPath);
    if (watcher) {
      watcher.jsonl.stop();
      watcher.legacy.stop();
      activeWatchers.delete(projectPath);
    }
    return Promise.resolve({ success: true });
  });

  // ── Task Launcher ──

  router.handle('workflow.launch', ({ taskDescription, projectPath, subProjectPath }) =>
    Promise.resolve(taskLauncher.launch(taskDescription, projectPath, subProjectPath)),
  );

  router.handle('workflow.isRunning', ({ sessionId }) =>
    Promise.resolve({ running: taskLauncher.isRunning(sessionId) }),
  );

  router.handle('workflow.stop', ({ sessionId }) =>
    Promise.resolve({ stopped: taskLauncher.stop(sessionId) }),
  );
}
