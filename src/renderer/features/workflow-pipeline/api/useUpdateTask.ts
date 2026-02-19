/**
 * Task update mutation hooks for the workflow pipeline
 *
 * Provides mutations for updating task description and plan content
 * via the Hub API.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from '@features/tasks/api/queryKeys';

/** Update a task's description via Hub */
export function useUpdateTaskDescription() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ taskId, description }: { taskId: string; description: string }) =>
      ipc('hub.tasks.update', { taskId, description }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
    onError: onError('update task description'),
  });
}

/** Update a task's plan content via Hub metadata */
export function useUpdateTaskPlan() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ taskId, planContent }: { taskId: string; planContent: string }) =>
      ipc('hub.tasks.update', { taskId, metadata: { planContent } }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) });
    },
    onError: onError('update task plan'),
  });
}
