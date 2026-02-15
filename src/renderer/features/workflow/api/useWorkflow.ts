/**
 * React Query hooks for workflow operations
 */

import { useMutation, useQuery } from '@tanstack/react-query';

import type { InvokeInput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

import { workflowKeys } from './queryKeys';

/** Start watching progress files in a project */
export function useStartProgressWatcher() {
  return useMutation({
    mutationFn: (data: InvokeInput<'workflow.watchProgress'>) =>
      ipc('workflow.watchProgress', data),
  });
}

/** Stop watching progress files */
export function useStopProgressWatcher() {
  return useMutation({
    mutationFn: (data: InvokeInput<'workflow.stopWatching'>) =>
      ipc('workflow.stopWatching', data),
  });
}

/** Launch a task execution */
export function useLaunchTask() {
  return useMutation({
    mutationFn: (data: InvokeInput<'workflow.launch'>) =>
      ipc('workflow.launch', data),
  });
}

/** Check if a session is running */
export function useSessionStatus(sessionId: string) {
  return useQuery({
    queryKey: workflowKeys.session(sessionId),
    queryFn: () => ipc('workflow.isRunning', { sessionId }),
    enabled: sessionId.length > 0,
    refetchInterval: 5_000,
  });
}

/** Stop a running session */
export function useStopSession() {
  return useMutation({
    mutationFn: (data: InvokeInput<'workflow.stop'>) =>
      ipc('workflow.stop', data),
  });
}
