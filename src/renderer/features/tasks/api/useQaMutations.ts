/**
 * QA mutation and query hooks
 *
 * Hooks for triggering QA runs and fetching QA reports.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from './queryKeys';

const qaKeys = {
  all: ['qa'] as const,
  report: (taskId: string) => [...qaKeys.all, 'report', taskId] as const,
  session: (taskId: string) => [...qaKeys.all, 'session', taskId] as const,
};

/** Fetch the QA report for a task */
export function useQaReport(taskId: string | null) {
  return useQuery({
    queryKey: qaKeys.report(taskId ?? ''),
    queryFn: () => ipc('qa.getReport', { taskId: taskId ?? '' }),
    enabled: taskId !== null && taskId.length > 0,
    staleTime: 30_000,
  });
}

/** Fetch the QA session for a task */
export function useQaSession(taskId: string | null) {
  return useQuery({
    queryKey: qaKeys.session(taskId ?? ''),
    queryFn: () => ipc('qa.getSession', { taskId: taskId ?? '' }),
    enabled: taskId !== null && taskId.length > 0,
    staleTime: 10_000,
  });
}

/** Start quiet QA for a task */
export function useStartQuietQa() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      ipc('qa.startQuiet', { taskId }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: qaKeys.session(variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('start quiet QA'),
  });
}

/** Start full QA for a task */
export function useStartFullQa() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      ipc('qa.startFull', { taskId }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: qaKeys.session(variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('start full QA'),
  });
}

/** Cancel a running QA session */
export function useCancelQa() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) =>
      ipc('qa.cancel', { sessionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qaKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('cancel QA'),
  });
}
