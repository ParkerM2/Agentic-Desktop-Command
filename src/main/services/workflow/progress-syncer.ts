/**
 * Progress Syncer
 *
 * Takes progress data from the ProgressWatcher and sends it to the Hub
 * via POST /api/tasks/:id/progress using the hub-api-client.
 */

import type { ProgressData } from './progress-watcher';
import type { HubApiClient } from '../hub/hub-api-client';

export interface ProgressSyncer {
  syncProgress: (taskId: string, progressData: ProgressData) => Promise<boolean>;
}

export function createProgressSyncer(hubClient: HubApiClient): ProgressSyncer {
  return {
    async syncProgress(taskId, progressData) {
      try {
        const result = await hubClient.pushProgress(taskId, {
          phase: progressData.phase,
          phaseIndex: progressData.phaseIndex,
          totalPhases: progressData.totalPhases,
          currentAgent: progressData.currentAgent,
          filesChanged: progressData.filesChanged,
          logLines: [],
        });

        if (!result.ok) {
          console.error(
            `[ProgressSyncer] Failed to sync progress for task ${taskId}:`,
            result.error,
          );
          return false;
        }

        console.log(`[ProgressSyncer] Synced progress for task ${taskId}: ${progressData.phase}`);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[ProgressSyncer] Error syncing progress for task ${taskId}:`, message);
        return false;
      }
    },
  };
}
