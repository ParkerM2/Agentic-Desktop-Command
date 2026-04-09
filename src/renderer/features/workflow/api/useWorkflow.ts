/**
 * React Query hooks for workflow operations
 */

import { useMutation, useQuery } from '@tanstack/react-query';

import { WORKFLOW } from '@shared/ipc/workflow/channels';
import type { InvokeInput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

import { workflowKeys } from './queryKeys';

/** Start watching progress files in a project */
export function useStartProgressWatcher() {
  return useMutation({
    mutationFn: (data: InvokeInput<typeof WORKFLOW.WATCH.PROGRESS>) =>
      ipc(WORKFLOW.WATCH.PROGRESS, data),
  });
}

/** Stop watching progress files */
export function useStopProgressWatcher() {
  return useMutation({
    mutationFn: (data: InvokeInput<typeof WORKFLOW.STOP.WATCHING>) =>
      ipc(WORKFLOW.STOP.WATCHING, data),
  });
}

/** Launch a task execution */
export function useLaunchTask() {
  return useMutation({
    mutationFn: (data: InvokeInput<typeof WORKFLOW.LAUNCH.WORKFLOW>) =>
      ipc(WORKFLOW.LAUNCH.WORKFLOW, data),
  });
}

/** Check if a session is running */
export function useSessionStatus(sessionId: string) {
  return useQuery({
    queryKey: workflowKeys.session(sessionId),
    queryFn: () => ipc(WORKFLOW.CHECK.RUNNING, { sessionId }),
    enabled: sessionId.length > 0,
    refetchInterval: 5_000,
  });
}

/** Stop a running session */
export function useStopSession() {
  return useMutation({
    mutationFn: (data: InvokeInput<typeof WORKFLOW.STOP.RUNNING>) =>
      ipc(WORKFLOW.STOP.RUNNING, data),
  });
}
