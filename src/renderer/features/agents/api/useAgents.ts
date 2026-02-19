/**
 * React Query hooks for agent orchestrator operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from '@features/tasks';

import { agentKeys } from './queryKeys';

/** Fetch all orchestrator sessions */
export function useAllAgents() {
  return useQuery({
    queryKey: agentKeys.all,
    queryFn: () => ipc('agent.listOrchestratorSessions', {}),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

/**
 * Fetch orchestrator sessions.
 * The orchestrator does not scope sessions by project,
 * so this delegates to the same query as useAllAgents.
 */
export function useAgents(_projectId: string | null) {
  return useAllAgents();
}

/** Kill an orchestrator session */
export function useStopAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => ipc('agent.killSession', { sessionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
