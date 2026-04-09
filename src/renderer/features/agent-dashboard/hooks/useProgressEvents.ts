/**
 * Task progress event subscription -> query invalidation
 *
 * Subscribes to task update events from the main process and
 * invalidates the relevant task queries in React Query cache.
 */

import { useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { agentDashboardKeys } from '../api/queryKeys';

/** Subscribe to task update events and invalidate task queries */
export function useProgressEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(AGENT_DASHBOARD_EVENTS.TASK.UPDATED, (event) => {
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.tasks(event.featureSlug),
    });
    void queryClient.invalidateQueries({
      queryKey: agentDashboardKeys.task(event.featureSlug, event.task.taskNumber),
    });
  });
}
