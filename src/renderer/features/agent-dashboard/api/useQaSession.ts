/**
 * QA session query hooks
 *
 * React Query hooks for fetching QA session data via IPC.
 * QA sessions refresh on a 5s stale window for near-real-time
 * verdict and check status display.
 */

import { useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { agentDashboardKeys } from './queryKeys';

/** Fetch the QA session for a specific task */
export function useQaSession(taskId: string | undefined) {
  return useQuery({
    queryKey: agentDashboardKeys.qaSession(taskId ?? ''),
    queryFn: () =>
      ipc('agent-dashboard.getQaSession', {
        taskId: taskId ?? '',
      }),
    enabled: taskId !== undefined,
    staleTime: 5_000,
  });
}

/** Fetch all QA sessions */
export function useQaSessions() {
  return useQuery({
    queryKey: agentDashboardKeys.qaSessions(),
    queryFn: () => ipc('agent-dashboard.listQaSessions', {}),
    staleTime: 5_000,
  });
}
