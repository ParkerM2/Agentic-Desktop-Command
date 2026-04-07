/**
 * VisualizationCanvas — main ReactFlow canvas combining codebase and agent layers.
 * Must be rendered inside <ReactFlowProvider> (Task 11).
 */

import { useCallback, useEffect, useMemo } from 'react';

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
import { useAgentTeams, useCodebaseGraph } from '../../api/visualization-api';
import {
  buildAgentRFNodes,
  buildCodebaseGroupEdges,
  buildCrossLayerEdges,
  buildHierarchicalCodebaseNodes,
} from '../../lib/graph-builders';
import { useVisualizationStore } from '../../store';
import { EDGE_TYPES } from '../edges';
import { NODE_TYPES } from '../nodes';
import { LayerToggleToolbar } from '../toolbar/LayerToggleToolbar';

import type { Node, NodeMouseHandler } from '@xyflow/react';

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

// ─── Search filter helper ─────────────────────────────────────────

function applySearchFilter(nodes: Node[], searchFilter: string): Node[] {
  if (searchFilter.trim() === '') return nodes;
  const query = searchFilter.toLowerCase();
  return nodes.map((node) => {
    const label = (node.data as { label?: string }).label ?? '';
    const matches = label.toLowerCase().includes(query);
    return {
      ...node,
      style: matches ? undefined : { opacity: 0.3 },
    };
  });
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
    layoutDirection,
    searchFilter,
    showEdgeLabels,
    toggleCodebaseLayer,
    toggleAgentLayer,
    setSelectedFeature,
    setLayoutDirection,
    setSearchFilter,
    toggleEdgeLabels,
    openDetailPanel,
  } = useVisualizationStore();

  const { fitView, zoomIn, zoomOut } = useReactFlow();
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
        ? buildHierarchicalCodebaseNodes(codebaseGraph, layoutDirection)
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

    // Group-level dependency edges between codebase groups
    const codebaseEdges =
      showCodebaseLayer && codebaseGraph
        ? buildCodebaseGroupEdges(codebaseGraph)
        : [];

    const allNodes = applySearchFilter(
      [...codebaseNodes, ...agentNodes],
      searchFilter,
    );

    return {
      nodes: allNodes,
      edges: [...codebaseEdges, ...crossEdges],
    };
  }, [
    codebaseGraph,
    agentTeams,
    showCodebaseLayer,
    showAgentLayer,
    selectedFeature,
    layoutDirection,
    searchFilter,
  ]);

  // ─── Fit view after nodes load ─────────────────────────────────

  useEffect(() => {
    // Delay fitView to ensure nodes are measured in the DOM
    const timer = setTimeout(() => {
      void fitView({ padding: 0.2, duration: 300 });
    }, 200);
    return () => { clearTimeout(timer); };
  }, [rfNodes, fitView]);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleInit = () => {
    setTimeout(() => {
      void fitView({ padding: 0.2, duration: 300 });
    }, 100);
  };

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

  const handleZoomIn = useCallback(() => {
    void zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    void zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    void fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

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
    <div className="h-full w-full">
    <ReactFlow
      elementsSelectable
      nodesDraggable
      edgeTypes={EDGE_TYPES}
      edges={rfEdges}
      edgesFocusable={false}
      maxZoom={3}
      minZoom={0.05}
      nodeTypes={NODE_TYPES}
      nodes={rfNodes}
      nodesConnectable={false}
      nodesFocusable={false}
      zoomOnDoubleClick={false}
      onInit={handleInit}
      onNodeClick={handleNodeClick}
    >
      <Background variant={BackgroundVariant.Dots} />
      <MiniMap nodeColor={getNodeColor} />
      <Panel position="top-right">
        <LayerToggleToolbar
          features={features}
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
      </Panel>
    </ReactFlow>
    </div>
  );
}
