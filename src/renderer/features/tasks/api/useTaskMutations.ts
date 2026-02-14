/**
 * Task mutation hooks — routed through Hub API
 *
 * No optimistic updates — WebSocket events trigger cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from './queryKeys';

/** Update a task's status via Hub */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      ipc('hub.tasks.updateStatus', {
        taskId,
        status: status as 'backlog' | 'queued' | 'running' | 'paused' | 'review' | 'done' | 'error',
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** Delete a task via Hub */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, projectId: _projectId }: { taskId: string; projectId?: string }) =>
      ipc('hub.tasks.delete', { taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** Execute a task via Hub */
export function useExecuteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, projectId: _projectId }: { taskId: string; projectId?: string }) =>
      ipc('hub.tasks.execute', { taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** Cancel a task via Hub */
export function useCancelTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason?: string }) =>
      ipc('hub.tasks.cancel', { taskId, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
