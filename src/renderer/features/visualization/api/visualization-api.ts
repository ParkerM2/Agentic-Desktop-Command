/**
 * TanStack Query hooks for visualization IPC channels
 */

import { useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { visualizationKeys } from './queryKeys';

/** Fetch codebase dependency graph — cached for 5 minutes */
export function useCodebaseGraph(projectId: string) {
  return useQuery({
    queryKey: visualizationKeys.codebaseGraph(projectId),
    queryFn: () => ipc('visualization.getCodebaseGraph', { projectId }),
    staleTime: 300_000,
    enabled: !!projectId,
  });
}

/** Fetch agent teams data — refreshes every 10 seconds */
export function useAgentTeams(projectId: string) {
  return useQuery({
    queryKey: visualizationKeys.agentTeams(projectId),
    queryFn: () => ipc('visualization.getAgentTeams', { projectId }),
    refetchInterval: 10_000,
    enabled: !!projectId,
  });
}

/** Fetch paginated session log for a specific agent */
export function useSessionLog(
  projectId: string,
  feature: string,
  agentName: string,
  cursor?: number,
) {
  return useQuery({
    queryKey: visualizationKeys.sessionLog(projectId, feature, agentName, cursor),
    queryFn: () => ipc('visualization.getSessionLog', { projectId, feature, agentName, cursor }),
    enabled: !!projectId && !!feature && !!agentName,
  });
}
