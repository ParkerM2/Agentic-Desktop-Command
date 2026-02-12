/**
 * Agent IPC event listeners → query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';

import { taskKeys } from '@features/tasks';

import { agentKeys } from '../api/queryKeys';

export function useAgentEvents() {
  const queryClient = useQueryClient();

  useIpcEvent('event:agent.statusChanged', ({ agentId: _agentId, taskId }) => {
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  useIpcEvent('event:agent.log', () => {
    // Agent logs can be handled in the agent detail view
  });
}
