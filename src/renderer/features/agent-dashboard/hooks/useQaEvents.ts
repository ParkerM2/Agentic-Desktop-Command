/**
 * QA session event subscription -> query invalidation
 *
 * Subscribes to QA session update events from the main process and
 * invalidates the relevant QA queries in React Query cache.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';

import { agentDashboardKeys } from '../api/queryKeys';

/** Subscribe to QA session update events and invalidate QA queries */
export function useQaEvents() {
  const queryClient = useQueryClient();

  useIpcEvent('event:agent-dashboard.qaSessionUpdated', (session) => {
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.qaSession(session.taskId),
    });
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.qaSessions(),
    });
  });
}
