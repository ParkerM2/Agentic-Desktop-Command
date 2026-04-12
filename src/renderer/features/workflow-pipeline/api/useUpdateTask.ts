/**
 * Task update mutation hooks for the workflow pipeline
 *
 * Provides mutations for updating progress task description and plan content
 * via the local ProgressService IPC channels.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PROGRESS } from '@shared/ipc/progress/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { progressKeys } from '@features/tasks/api/progressKeys';

/** Update a progress task's description */
export function useUpdateTaskDescription() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ slug, description }: { slug: string; description: string }) =>
      ipc(PROGRESS.UPDATE.TASK, { slug, updates: { description } }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
      void queryClient.invalidateQueries({ queryKey: progressKeys.detail(variables.slug) });
    },
    onError: onError('update task description'),
  });
}

/** Update a progress task's plan content (stored as planContent in frontmatter) */
export function useUpdateTaskPlan() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ slug, planContent }: { slug: string; planContent: string }) =>
      ipc(PROGRESS.UPDATE.TASK, { slug, updates: { description: planContent } }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: progressKeys.list() });
      void queryClient.invalidateQueries({ queryKey: progressKeys.detail(variables.slug) });
    },
    onError: onError('update task plan'),
  });
}
