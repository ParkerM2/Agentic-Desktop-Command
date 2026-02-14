/**
 * Workflow IPC handlers
 *
 * Manages progress watching for project directories and task launching.
 * Watches docs/progress/*.md files and syncs changes to Hub.
 * Launches Claude CLI sessions for task execution.
 */

import { createProgressSyncer } from '../../services/workflow/progress-syncer';
import { createProgressWatcher } from '../../services/workflow/progress-watcher';

import type { HubApiClient } from '../../services/hub/hub-api-client';
import type { ProgressWatcher } from '../../services/workflow/progress-watcher';
import type { TaskLauncherService } from '../../services/workflow/task-launcher';
import type { IpcRouter } from '../router';

/** Active watchers keyed by project path. */
const activeWatchers = new Map<string, ProgressWatcher>();

export function registerWorkflowHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient | null,
  taskLauncher: TaskLauncherService,
): void {
  router.handle('workflow.watchProgress', ({ projectPath }) => {
    // Stop existing watcher for this path if any
    const existing = activeWatchers.get(projectPath);
    if (existing) {
      existing.stop();
      activeWatchers.delete(projectPath);
    }

    const watcher = createProgressWatcher(projectPath);

    // If hub client is available, wire up the syncer
    if (hubApiClient) {
      const syncer = createProgressSyncer(hubApiClient);
      watcher.onProgress((data) => {
        void syncer.syncProgress(data.taskId, data);
      });
    }

    // Also emit IPC events for renderer updates
    watcher.onProgress((data) => {
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

    watcher.start();
    activeWatchers.set(projectPath, watcher);

    return Promise.resolve({ success: true });
  });

  router.handle('workflow.stopWatching', ({ projectPath }) => {
    const watcher = activeWatchers.get(projectPath);
    if (watcher) {
      watcher.stop();
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
