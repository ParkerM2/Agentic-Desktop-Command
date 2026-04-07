import { useCallback, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';

import { useLooseParams } from '@renderer/shared/hooks';

import { PageHeader, PageLayout } from '@ui';

import { visualizationKeys } from '../api/queryKeys';
import { useAgentTeams, useCodebaseGraph } from '../api/visualization-api';
import { useVisualizationStore } from '../store';

import { VisualizationCanvas } from './canvas/VisualizationCanvas';
import { NodeDetailPanel } from './panels/NodeDetailPanel';
import { LayerToggleToolbar } from './toolbar/LayerToggleToolbar';

// ─── Inner component (must be inside ReactFlowProvider) ─────────

function VisualizationPageContent({ projectId }: { projectId: string }) {
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

  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const queryClient = useQueryClient();

  const codebaseQuery = useCodebaseGraph(projectId);
  const agentQuery = useAgentTeams(projectId);
  const agentTeams = agentQuery.data;

  // ─── Derived feature list ──────────────────────────────────────

  const features = useMemo(
    () => agentTeams?.features.map((f) => f.feature) ?? [],
    [agentTeams],
  );

  // ─── Handlers ─────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: visualizationKeys.codebaseGraph(projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: visualizationKeys.agentTeams(projectId),
    });
  }, [queryClient, projectId]);

  const handleZoomIn = useCallback(() => {
    void zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    void zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    void fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // ─── Loading check (for disabling toolbar actions) ────────────

  const isPending = codebaseQuery.isPending || agentQuery.isPending;

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Codebase structure and agent activity">
            Visual Map
          </PageHeader.Title>
          <PageHeader.Actions>
            <LayerToggleToolbar
              features={features}
              isPending={isPending}
              layoutDirection={layoutDirection}
              searchFilter={searchFilter}
              selectedFeature={selectedFeature}
              showAgentLayer={showAgentLayer}
              showCodebaseLayer={showCodebaseLayer}
              showEdgeLabels={showEdgeLabels}
              onFitView={handleFitView}
              onRefresh={handleRefresh}
              onSelectFeature={setSelectedFeature}
              onSetLayoutDirection={setLayoutDirection}
              onSetSearchFilter={setSearchFilter}
              onToggleAgent={toggleAgentLayer}
              onToggleCodebase={toggleCodebaseLayer}
              onToggleEdgeLabels={toggleEdgeLabels}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
            />
          </PageHeader.Actions>
        </PageHeader.Row>
      </PageHeader>
      <div className="relative flex-1">
        <VisualizationCanvas projectId={projectId} />
        <NodeDetailPanel projectId={projectId} />
      </div>
    </PageLayout>
  );
}

// ─── Page (provides ReactFlowProvider context) ──────────────────

export function VisualizationPage() {
  const params = useLooseParams();
  const projectId = params.projectId ?? '';

  return (
    <ReactFlowProvider>
      <VisualizationPageContent projectId={projectId} />
    </ReactFlowProvider>
  );
}
