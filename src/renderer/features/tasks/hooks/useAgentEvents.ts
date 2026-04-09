/**
 * Agent dashboard IPC event listeners -> query invalidation
 *
 * Bridges real-time agent events from the main process to React Query cache.
 * Session status changes trigger full invalidation so task rows refresh.
 */

import { useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { taskKeys } from '../api/queryKeys';

export function useAgentEvents() {
  const queryClient = useQueryClient();

  // Session started -> invalidate task lists to reflect new agent activity
  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION.STARTED, () => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Session status changed -> invalidate tasks
  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED'], () => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  // Session ended -> full invalidation
  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION.ENDED, () => {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });
}
