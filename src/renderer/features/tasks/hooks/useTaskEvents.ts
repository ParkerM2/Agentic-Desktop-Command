/**
 * Task IPC event listeners → query invalidation
 *
 * Bridges real-time events from the main process to React Query cache.
 */

import { useQueryClient } from '@tanstack/react-query';

import type { Task } from '@shared/types';

import { useIpcEvent } from '@renderer/shared/hooks';

import { taskKeys } from '../api/queryKeys';

export function useTaskEvents() {
  const queryClient = useQueryClient();

  // Task status changed → invalidate list and detail
  useIpcEvent('event:task.statusChanged', ({ taskId, projectId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  });

  // Task progress updated → patch detail cache directly
  useIpcEvent('event:task.progressUpdated', ({ taskId, progress }) => {
    queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) =>
      old ? { ...old, executionProgress: progress } : old,
    );
    // Also invalidate lists to update progress indicators on cards
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Log appended → patch detail cache
  useIpcEvent('event:task.logAppended', ({ taskId, log }) => {
    queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) =>
      old ? { ...old, logs: [...(old.logs ?? []), log] } : old,
    );
  });

  // Plan updated → invalidate detail
  useIpcEvent('event:task.planUpdated', ({ taskId }) => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
  });
}
