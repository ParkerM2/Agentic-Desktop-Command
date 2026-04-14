/**
 * Visualization React Query hooks — Feature Slice Design canonical hooks file.
 *
 * Replaces the now-deleted visualization-api.ts workaround.
 */

import { useQuery } from '@tanstack/react-query';

import { VISUALIZATION } from '@shared/ipc/visualization/channels';

import { ipc } from '@renderer/shared/lib/ipc';

import { visualizationKeys } from './queryKeys';

/** Fetch codebase dependency graph — cached for 5 minutes */
export function useCodebaseGraph(projectId: string) {
  return useQuery({
    queryKey: visualizationKeys.codebaseGraph(projectId),
    queryFn: () => ipc(VISUALIZATION.GET['CODEBASE-GRAPH'], { projectId }),
    staleTime: 300_000,
    enabled: !!projectId,
  });
}

/** Fetch agent teams data — refreshes every 10 seconds */
export function useAgentTeams(projectId: string) {
  return useQuery({
    queryKey: visualizationKeys.agentTeams(projectId),
    queryFn: () => ipc(VISUALIZATION.GET['AGENT-TEAMS'], { projectId }),
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
    queryFn: () =>
      ipc(VISUALIZATION.GET['SESSION-LOG'], { projectId, feature, agentName, cursor }),
    enabled: !!projectId && !!feature && !!agentName,
  });
}
