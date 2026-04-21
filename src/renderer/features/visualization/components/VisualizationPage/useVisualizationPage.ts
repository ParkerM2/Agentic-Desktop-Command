import { useCallback, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { useLooseParams } from '@renderer/shared/hooks';

import { visualizationKeys } from '../../api/queryKeys';
import { useAgentTeams, useCodebaseGraph } from '../../api/useVisualization';
import { useVisualizationStore } from '../../store';

export function useVisualizationPage(projectId: string) {
  const {
    showCodebaseLayer,
    showAgentLayer,
    selectedFeature,
    layoutDirection,
    searchFilter,
    showEdgeLabels,
    toggleCodebaseLayer,
    toggleAgentLayer,
    setSelectedFeature,
    setLayoutDirection,
    setSearchFilter,
    toggleEdgeLabels,
  } = useVisualizationStore();

  const queryClient = useQueryClient();

  const codebaseQuery = useCodebaseGraph(projectId);
  const agentQuery = useAgentTeams(projectId);
  const agentTeams = agentQuery.data;

  const features = useMemo(
    () => agentTeams?.features.map((f) => f.feature) ?? [],
    [agentTeams],
  );

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: visualizationKeys.codebaseGraph(projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: visualizationKeys.agentTeams(projectId),
    });
  }, [queryClient, projectId]);

  const isPending = codebaseQuery.isPending || agentQuery.isPending;

  return {
    showCodebaseLayer,
    showAgentLayer,
    selectedFeature,
    layoutDirection,
    searchFilter,
    showEdgeLabels,
    toggleCodebaseLayer,
    toggleAgentLayer,
    setSelectedFeature,
    setLayoutDirection,
    setSearchFilter,
    toggleEdgeLabels,
    features,
    handleRefresh,
    isPending,
  };
}

export function useVisualizationPageParams() {
  const params = useLooseParams();
  return { projectId: params.projectId ?? '' };
}
