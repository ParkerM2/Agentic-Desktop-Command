/**
 * VisualizationCanvas — main ReactFlow canvas combining codebase and agent layers.
 * Must be rendered inside <ReactFlowProvider> (Task 11).
 */

import { useEffect, useMemo } from 'react';

import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';

import { Spinner } from '@ui';

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
    setSelectedFeature,
    openDetailPanel,
  } = useVisualizationStore();

  const { fitView } = useReactFlow();

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

  // ─── Loading state ─────────────────────────────────────────────

  const isPending = codebaseQuery.isPending || agentQuery.isPending;

  if (isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // ─── Canvas (renders empty ReactFlow with background when no nodes) ─

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
      {rfNodes.length > 0 ? <MiniMap nodeColor={getNodeColor} /> : null}
    </ReactFlow>
    </div>
  );
}
