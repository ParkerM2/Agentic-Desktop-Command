/**
 * Task mutation hooks — routed through Hub API
 *
 * No optimistic updates — WebSocket events trigger cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { HUB_TASKS } from '@shared/ipc/hub-tasks/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from './queryKeys';

/** Update a task's status via Hub */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      ipc(HUB_TASKS.UPDATE.STATUS, {
        taskId,
        status: status as 'backlog' | 'queued' | 'running' | 'paused' | 'review' | 'done' | 'error',
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('update task status'),
  });
}

/** Delete a task via Hub */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ taskId, projectId: _projectId }: { taskId: string; projectId?: string }) =>
      ipc(HUB_TASKS.DELETE.TASK, { taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('delete task'),
  });
}

/** Execute a task via Hub */
export function useExecuteTask() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ taskId, projectId: _projectId }: { taskId: string; projectId?: string }) =>
      ipc(HUB_TASKS.EXECUTE.TASK, { taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('execute task'),
  });
}

/** Cancel a task via Hub */
export function useCancelTask() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason?: string }) =>
      ipc(HUB_TASKS.CANCEL.TASK, { taskId, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('cancel task'),
  });
}
