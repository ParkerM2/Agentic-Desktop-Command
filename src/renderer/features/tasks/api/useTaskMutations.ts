/**
 * Task mutation hooks — status updates, delete, execute
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Task, TaskStatus } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from './queryKeys';

/** Update a task's status with optimistic update */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      ipc('tasks.updateStatus', { taskId, status }),
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Optimistic update across all task lists
      queryClient.setQueriesData<Task[]>({ queryKey: taskKeys.lists() }, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** Delete a task */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, projectId }: { taskId: string; projectId: string }) =>
      ipc('tasks.delete', { taskId, projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** Execute a task (start an agent) */
export function useExecuteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, projectId }: { taskId: string; projectId: string }) =>
      ipc('tasks.execute', { taskId, projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
