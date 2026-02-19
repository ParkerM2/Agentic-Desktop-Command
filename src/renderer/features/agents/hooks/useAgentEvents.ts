/**
 * Agent orchestrator IPC event listeners → query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';

import { taskKeys } from '@features/tasks';

import { agentKeys } from '../api/queryKeys';

export function useAgentEvents() {
  const queryClient = useQueryClient();

  useIpcEvent('event:agent.orchestrator.heartbeat', () => {
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
  });

  useIpcEvent('event:agent.orchestrator.stopped', ({ taskId }) => {
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });

  useIpcEvent('event:agent.orchestrator.error', ({ taskId }) => {
    void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  });
}
