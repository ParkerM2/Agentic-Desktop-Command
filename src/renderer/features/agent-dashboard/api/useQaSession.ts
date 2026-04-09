/**
 * QA session query hooks
 *
 * React Query hooks for fetching QA session data via IPC.
 * QA sessions refresh on a 5s stale window for near-real-time
 * verdict and check status display.
 */

import { useQuery } from '@tanstack/react-query';

import { AGENT_DASHBOARD } from '@shared/ipc/agent-dashboard/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { agentDashboardKeys } from './queryKeys';

/** Fetch the QA session for a specific task */
export function useQaSession(taskId: string | undefined) {
  return useQuery({
    queryKey: agentDashboardKeys.qaSession(taskId ?? ''),
    queryFn: () =>
      ipc(AGENT_DASHBOARD.GET['QA-SESSION'], {
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
    queryFn: () => ipc(AGENT_DASHBOARD.LIST['QA-SESSIONS'], {}),
    staleTime: 5_000,
  });
}
