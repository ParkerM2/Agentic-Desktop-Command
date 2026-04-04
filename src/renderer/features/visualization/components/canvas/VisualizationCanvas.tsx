/**
 * VisualizationCanvas — main ReactFlow canvas combining codebase and agent layers.
 * Must be rendered inside <ReactFlowProvider> (Task 11).
 */

import { useEffect, useMemo } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import { Network } from 'lucide-react';

import { EmptyState, Spinner } from '@ui';

import { visualizationKeys } from '../../api/queryKeys';
import { useCodebaseGraph, useAgentTeams } from '../../api/visualization-api';
import {
  buildAgentRFNodes,
  buildCodebaseRFNodes,
  buildCrossLayerEdges,
} from '../../lib/graph-builders';
import { useVisualizationStore } from '../../store';
import { EDGE_TYPES } from '../edges';
import { NODE_TYPES } from '../nodes';
import { LayerToggleToolbar } from '../toolbar/LayerToggleToolbar';

import type { NodeMouseHandler } from '@xyflow/react';

// ─── Per-type minimap colours ─────────────────────────────────────

function getNodeColor(node: { type?: string }): string {
  const type = node.type ?? 'unknown';
  switch (type) {
    case 'file': {
      return '#6366f1';
    }
    case 'fileGroup': {
      return '#8b5cf6';
    }
    case 'agentTask': {
      return '#22c55e';
    }
    case 'guardian': {
      return '#f59e0b';
    }
    case 'featureGroup': {
      return '#3b82f6';
    }
    default: {
      return '#94a3b8';
    }
  }
}

// ─── Props ────────────────────────────────────────────────────────

interface VisualizationCanvasProps {
  projectId: string;
}

// ─── Component ───────────────────────────────────────────────────

export function VisualizationCanvas({ projectId }: VisualizationCanvasProps) {
  const {
    showCodebaseLayer,
    showAgentLayer,
    selectedFeature,
    toggleCodebaseLayer,
    toggleAgentLayer,
    setSelectedFeature,
    openDetailPanel,
  } = useVisualizationStore();

  const { fitView } = useReactFlow();
  const queryClient = useQueryClient();

  const codebaseQuery = useCodebaseGraph(projectId);
  const agentQuery = useAgentTeams(projectId);

  const codebaseGraph = codebaseQuery.data;
  const agentTeams = agentQuery.data;

  // ─── Derived feature list ──────────────────────────────────────

  const features = useMemo(
    () => agentTeams?.features.map((f) => f.feature) ?? [],
    [agentTeams],
  );

  // Default selectedFeature to first feature when data arrives
  useEffect(() => {
    if (selectedFeature === null && features.length > 0) {
      setSelectedFeature(features[0] ?? null);
    }
  }, [features, selectedFeature, setSelectedFeature]);

  // ─── Graph assembly ────────────────────────────────────────────

  const { nodes: rfNodes, edges: rfEdges } = useMemo(() => {
    const codebaseNodes =
      showCodebaseLayer && codebaseGraph
        ? buildCodebaseRFNodes(codebaseGraph)
        : [];

    const agentXOffset = codebaseNodes.length > 0 ? 1200 : 0;
    const agentNodes =
      showAgentLayer && agentTeams
        ? buildAgentRFNodes(agentTeams, selectedFeature, agentXOffset)
        : [];

    const crossEdges =
      showCodebaseLayer && showAgentLayer
        ? buildCrossLayerEdges(agentNodes, codebaseNodes)
        : [];

    // Codebase edges come from the schema's edges array; built inline here.
    const codebaseEdges =
      showCodebaseLayer && codebaseGraph
        ? codebaseGraph.edges.map((e) => ({
            id: `codebase-${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            type: 'dataFlow' as const,
          }))
        : [];

    return {
      nodes: [...codebaseNodes, ...agentNodes],
      edges: [...codebaseEdges, ...crossEdges],
    };
  }, [codebaseGraph, agentTeams, showCodebaseLayer, showAgentLayer, selectedFeature]);

  // ─── Fit view after nodes load ─────────────────────────────────

  useEffect(() => {
    window.requestAnimationFrame(() => {
      void fitView({ padding: 0.1, duration: 400 });
    });
  }, [rfNodes, fitView]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    openDetailPanel(node.id);
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({
      queryKey: visualizationKeys.codebaseGraph(projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: visualizationKeys.agentTeams(projectId),
    });
  };

  // ─── Loading state ─────────────────────────────────────────────

  const isPending = codebaseQuery.isPending || agentQuery.isPending;

  if (isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────────────

  if (rfNodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <EmptyState
          description="Enable at least one layer to visualise the project."
          icon={Network}
          title="Nothing to display"
        />
      </div>
    );
  }

  // ─── Canvas ────────────────────────────────────────────────────

  return (
    <ReactFlow
      elementsSelectable
      onlyRenderVisibleElements
      edgeTypes={EDGE_TYPES}
      edges={rfEdges}
      edgesFocusable={false}
      maxZoom={3}
      minZoom={0.05}
      nodeTypes={NODE_TYPES}
      nodes={rfNodes}
      nodesConnectable={false}
      nodesDraggable={false}
      nodesFocusable={false}
      zoomOnDoubleClick={false}
      onNodeClick={handleNodeClick}
    >
      <Background variant={BackgroundVariant.Dots} />
      <MiniMap nodeColor={getNodeColor} />
      <Panel position="top-right">
        <LayerToggleToolbar
          features={features}
          selectedFeature={selectedFeature}
          showAgentLayer={showAgentLayer}
          showCodebaseLayer={showCodebaseLayer}
          onRefresh={handleRefresh}
          onSelectFeature={setSelectedFeature}
          onToggleAgent={toggleAgentLayer}
          onToggleCodebase={toggleCodebaseLayer}
        />
      </Panel>
    </ReactFlow>
  );
}
