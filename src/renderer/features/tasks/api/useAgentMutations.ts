/**
 * Agent mutation hooks (stubs)
 *
 * The old agent orchestrator has been removed. These hooks are preserved
 * as no-op stubs so that existing UI call-sites continue to compile.
 * They will be replaced with progress-pipeline equivalents when those
 * IPC channels are wired up.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useMutationErrorToast } from '@renderer/shared/hooks';

import { taskKeys } from './queryKeys';

/** Start planning for a task — stub (orchestrator removed) */
export function useStartPlanning() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (_input: {
      taskId: string;
      projectPath: string;
      taskDescription: string;
      subProjectPath?: string;
    }) => Promise.resolve({ sessionId: '', status: 'stub' as const }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('start planning'),
  });
}

/** Start execution for a task — stub (orchestrator removed) */
export function useStartExecution() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (_input: {
      taskId: string;
      projectPath: string;
      taskDescription: string;
      planRef?: string;
      subProjectPath?: string;
    }) => Promise.resolve({ sessionId: '', status: 'stub' as const }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('start execution'),
  });
}

/** Re-plan a task with user feedback — stub (orchestrator removed) */
export function useReplanWithFeedback() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (_input: {
      taskId: string;
      projectPath: string;
      taskDescription: string;
      feedback: string;
      previousPlanPath?: string;
      subProjectPath?: string;
    }) => Promise.resolve({ sessionId: '', status: 'stub' as const }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('re-plan with feedback'),
  });
}

/** Kill an active agent session — stub (orchestrator removed) */
export function useKillAgent() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (_input: { sessionId: string }) => Promise.resolve({ success: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('kill agent'),
  });
}

/** Restart an agent from its last checkpoint — stub (orchestrator removed) */
export function useRestartFromCheckpoint() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (_input: { taskId: string; projectPath: string }) => Promise.resolve({
      sessionId: '',
      status: 'stub' as const,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: onError('restart from checkpoint'),
  });
}
