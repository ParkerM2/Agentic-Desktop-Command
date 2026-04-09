/**
 * Agent dashboard IPC event listeners -> query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD_EVENTS } from '@shared/ipc/agent-dashboard/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { taskKeys } from '@features/tasks';

import { agentKeys } from '../api/queryKeys';

export function useAgentEvents() {
  const queryClient = useQueryClient();

  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION.STARTED, () => {
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
  });

  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION.ENDED, () => {
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  useIpcEvent(AGENT_DASHBOARD_EVENTS.SESSION['STATUS-CHANGED'], () => {
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
  });
}
