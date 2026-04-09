/**
 * QA session event subscription -> query invalidation
 *
 * Subscribes to QA session update events from the main process and
 * invalidates the relevant QA queries in React Query cache.
 */

import { useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { agentDashboardKeys } from '../api/queryKeys';

/** Subscribe to QA session update events and invalidate QA queries */
export function useQaEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(AGENT_DASHBOARD_EVENTS.QA['SESSION-UPDATED'], (session) => {
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.qaSession(session.taskId),
    });
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.qaSessions(),
    });
  });
}
