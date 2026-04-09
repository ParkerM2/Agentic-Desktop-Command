/**
 * React Query hooks for agent dashboard sessions (v2)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AGENT_DASHBOARD } from '@shared/ipc/agent-dashboard/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { taskKeys } from '@features/tasks';

import { agentKeys } from './queryKeys';

/** Fetch all agent dashboard sessions */
export function useAllAgents() {
  return useQuery({
    queryKey: agentKeys.all,
    queryFn: () => ipc(AGENT_DASHBOARD.LIST.SESSIONS, {}),
    staleTime: 5_000,
  });
}

/**
 * Fetch agent sessions.
 * The dashboard lists all sessions regardless of project,
 * so this delegates to the same query as useAllAgents.
 */
export function useAgents(_projectId: string | null) {
  return useAllAgents();
}

/** Stop an agent session */
export function useStopAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => ipc(AGENT_DASHBOARD.STOP.SESSION, { sessionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
