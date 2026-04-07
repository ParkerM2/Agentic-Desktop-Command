import Dagre from '@dagrejs/dagre';

import type {
  AgentTeamsDataSchema,
  CodebaseGraphSchema,
} from '@shared/ipc/visualization/schemas';

import type { Edge, Node } from '@xyflow/react';
import type { z } from 'zod';


type CodebaseGraph = z.infer<typeof CodebaseGraphSchema>;
type AgentTeamsData = z.infer<typeof AgentTeamsDataSchema>;

// ─── Node data types ──────────────────────────────────────────────

export interface FileGroupData {
  type: 'fileGroup';
  label: string;
  fileCount: number;
  isParent?: boolean;
  parentLayer?: string;
}

export interface FileNodeData {
  type: 'file';
  label: string;
  path: string;
  relativePath: string;
  ext: string;
  importCount: number;
  group: string;
}

export type AgentStatus = 'pending' | 'active' | 'completed' | 'error' | 'idle';

export interface FeatureGroupData {
  type: 'featureGroup';
  label: string;
  feature: string;
  status: string;
  branch: string | null;
  agentCount: number;
}

export interface AgentTaskData {
  type: 'agentTask' | 'guardian';
  label: string;
  agentName: string;
  taskNumber: number | null;
  taskName: string | null;
  agentRole: string | null;
  wave: number | null;
  status: AgentStatus;
  lastEventTs: string | null;
  fileScope: string[];
  eventCount: number;
  isGuardian: boolean;
}

export type FileGroupNode = Node<FileGroupData & Record<string, unknown>, 'fileGroup'>;
export type FileNode = Node<FileNodeData & Record<string, unknown>, 'file'>;
export type FeatureGroupNode = Node<FeatureGroupData & Record<string, unknown>, 'featureGroup'>;
export type AgentTaskNode = Node<AgentTaskData & Record<string, unknown>, 'agentTask' | 'guardian'>;

export type CodebaseRFNode = FileGroupNode | FileNode;
export type AgentRFNode = FeatureGroupNode | AgentTaskNode;

// ─── Layout helpers ──────────────────────────────────────────────

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const GROUP_NODE_WIDTH = 180;
const GROUP_NODE_HEIGHT = 40;

/**
 * Applies dagre layout to a flat list of nodes + edges.
 * Mutates node positions in-place and returns the same array.
 */
function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): void {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  for (const node of nodes) {
    const isGroup = node.type === 'fileGroup' || node.type === 'featureGroup';
    g.setNode(node.id, {
      width: isGroup ? GROUP_NODE_WIDTH : NODE_WIDTH,
      height: isGroup ? GROUP_NODE_HEIGHT : NODE_HEIGHT,
    });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  Dagre.layout(g);

  for (const node of nodes) {
    const pos = g.node(node.id);
    const isGroup = node.type === 'fileGroup' || node.type === 'featureGroup';
    const w = isGroup ? GROUP_NODE_WIDTH : NODE_WIDTH;
    const h = isGroup ? GROUP_NODE_HEIGHT : NODE_HEIGHT;
    node.position = { x: pos.x - w / 2, y: pos.y - h / 2 };
  }
}

// ─── Layer classification helpers ────────────────────────────────

type ArchLayer = 'main' | 'features' | 'shared' | 'renderer' | 'preload';

const LAYER_LABELS: Record<ArchLayer, string> = {
  main: 'Main Process',
  features: 'Features',
  shared: 'Shared',
  renderer: 'Renderer',
  preload: 'Preload',
};

function classifyGroupLayer(groupName: string): ArchLayer {
  const lower = groupName.toLowerCase();
  if (lower.startsWith('main/') || lower === 'main') return 'main';
  if (lower.startsWith('features/') || lower === 'features') return 'features';
  if (lower.startsWith('shared/') || lower === 'shared') return 'shared';
  if (lower.startsWith('preload') || lower === 'preload') return 'preload';
  if (lower.startsWith('renderer/') || lower === 'renderer') return 'renderer';
  // Default non-matching groups to renderer
  return 'renderer';
}

// ─── Codebase graph builder ───────────────────────────────────────

/**
 * Transforms a CodebaseGraph into React Flow nodes.
 * Shows only group-level nodes for performance — individual files
 * are summarized in the group node's fileCount.
 * Groups are laid out with dagre using cross-group import edges.
 */
export function buildCodebaseRFNodes(
  graph: CodebaseGraph,
  direction: 'TB' | 'LR' = 'TB',
): CodebaseRFNode[] {
  const nodes: CodebaseRFNode[] = [];
  const layoutEdges: Edge[] = [];

  // Build group nodes
  for (const groupName of graph.groups) {
    const groupId = `group-${groupName}`;
    const filesInGroup = graph.files.filter((f) => f.group === groupName);

    const groupNode: FileGroupNode = {
      id: groupId,
      type: 'fileGroup',
      position: { x: 0, y: 0 },
      data: {
        type: 'fileGroup',
        label: groupName,
        fileCount: filesInGroup.length,
      },
    };
    nodes.push(groupNode);
  }

  // Build group-to-group edges from file-level imports
  const fileToGroup = new Map<string, string>();
  for (const file of graph.files) {
    fileToGroup.set(file.path, `group-${file.group}`);
  }

  const edgeSet = new Set<string>();
  for (const edge of graph.edges) {
    const sourceGroup = fileToGroup.get(edge.source);
    const targetGroup = fileToGroup.get(edge.target);
    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      const key = `${sourceGroup}->${targetGroup}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        layoutEdges.push({
          id: `group-edge-${key}`,
          source: sourceGroup,
          target: targetGroup,
        });
      }
    }
  }

  applyDagreLayout(nodes, layoutEdges, direction);

  return nodes;
}

// ─── Hierarchical codebase graph builder ─────────────────────────

const PARENT_NODE_WIDTH = 220;
const PARENT_NODE_HEIGHT = 50;

/** Classify groups into architecture layers. */
function classifyGroups(groups: readonly string[]): Map<ArchLayer, string[]> {
  const layerGroups = new Map<ArchLayer, string[]>();
  for (const groupName of groups) {
    const layer = classifyGroupLayer(groupName);
    const existing = layerGroups.get(layer) ?? [];
    existing.push(groupName);
    layerGroups.set(layer, existing);
  }
  return layerGroups;
}

/** Build cross-group layout edges from file-level imports. */
function buildCrossGroupLayoutEdges(graph: CodebaseGraph): Edge[] {
  const fileToGroup = new Map<string, string>();
  for (const file of graph.files) {
    fileToGroup.set(file.path, `group-${file.group}`);
  }

  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  for (const edge of graph.edges) {
    const sourceGroup = fileToGroup.get(edge.source);
    const targetGroup = fileToGroup.get(edge.target);
    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      const key = `${sourceGroup}->${targetGroup}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ id: `group-edge-${key}`, source: sourceGroup, target: targetGroup });
      }
    }
  }
  return edges;
}

/** Apply dagre layout to hierarchical nodes that include parent-sized nodes. */
function applyHierarchicalDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR',
): void {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  for (const node of nodes) {
    const isParent = node.data.isParent === true;
    g.setNode(node.id, {
      width: isParent ? PARENT_NODE_WIDTH : GROUP_NODE_WIDTH,
      height: isParent ? PARENT_NODE_HEIGHT : GROUP_NODE_HEIGHT,
    });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  Dagre.layout(g);

  for (const node of nodes) {
    const pos = g.node(node.id);
    const isParent = node.data.isParent === true;
    const w = isParent ? PARENT_NODE_WIDTH : GROUP_NODE_WIDTH;
    const h = isParent ? PARENT_NODE_HEIGHT : GROUP_NODE_HEIGHT;
    node.position = { x: pos.x - w / 2, y: pos.y - h / 2 };
  }
}

/**
 * Builds hierarchical codebase nodes with parent layer grouping.
 * Groups are classified into architecture layers (Main, Features, Shared, Renderer, Preload).
 * Parent nodes represent layers; child nodes are file groups within each layer.
 */
export function buildHierarchicalCodebaseNodes(
  graph: CodebaseGraph,
  direction: 'TB' | 'LR' = 'TB',
): CodebaseRFNode[] {
  const nodes: CodebaseRFNode[] = [];
  const layoutEdges: Edge[] = [];
  const layerGroups = classifyGroups(graph.groups);

  // Create parent + child nodes for each layer
  for (const [layer, groups] of layerGroups) {
    const parentId = `layer-${layer}`;
    const totalFiles = groups.reduce((sum, gName) => {
      return sum + graph.files.filter((f) => f.group === gName).length;
    }, 0);

    nodes.push({
      id: parentId,
      type: 'fileGroup',
      position: { x: 0, y: 0 },
      data: { type: 'fileGroup', label: LAYER_LABELS[layer], fileCount: totalFiles, isParent: true, parentLayer: layer },
    });

    for (const groupName of groups) {
      const groupId = `group-${groupName}`;
      nodes.push({
        id: groupId,
        type: 'fileGroup',
        position: { x: 0, y: 0 },
        data: { type: 'fileGroup', label: groupName, fileCount: graph.files.filter((f) => f.group === groupName).length, parentLayer: layer },
      });
      layoutEdges.push({ id: `hierarchy-${parentId}-${groupId}`, source: parentId, target: groupId });
    }
  }

  layoutEdges.push(...buildCrossGroupLayoutEdges(graph));
  applyHierarchicalDagreLayout(nodes, layoutEdges, direction);

  return nodes;
}

// ─── Agent graph builder ──────────────────────────────────────────

/**
 * Transforms AgentTeamsData into React Flow nodes for the agent layer.
 * If selectedFeature is null, uses the first feature in data.features.
 * All nodes are offset horizontally by xOffset.
 */
export function buildAgentRFNodes(
  data: AgentTeamsData,
  selectedFeature: string | null,
  xOffset: number,
): AgentRFNode[] {
  const featureName = selectedFeature ?? data.features[0]?.feature;
  if (!featureName) return [];

  const featureData = data.features.find((f) => f.feature === featureName);
  if (!featureData) return [];

  const nodes: AgentRFNode[] = [];
  const layoutEdges: Edge[] = [];
  const groupId = `feature-${featureName}`;

  const groupNode: FeatureGroupNode = {
    id: groupId,
    type: 'featureGroup',
    position: { x: xOffset, y: 0 },
    data: {
      type: 'featureGroup',
      label: featureName,
      feature: featureName,
      status: featureData.status,
      branch: featureData.branch,
      agentCount: featureData.agentCount,
    },
  };
  nodes.push(groupNode);

  for (const task of featureData.tasks) {
    const nodeType = task.isGuardian ? 'guardian' : 'agentTask';
    const childNode: AgentTaskNode = {
      id: `agent-${task.agentName}`,
      type: nodeType,
      position: { x: xOffset, y: 0 },
      data: {
        type: nodeType,
        label: task.taskName ?? task.agentName,
        agentName: task.agentName,
        taskNumber: task.taskNumber,
        taskName: task.taskName,
        agentRole: task.agentRole,
        wave: task.wave,
        status: task.status,
        lastEventTs: task.lastEventTs,
        fileScope: task.fileScope,
        eventCount: task.eventCount,
        isGuardian: task.isGuardian,
      },
    };
    nodes.push(childNode);

    layoutEdges.push({
      id: `layout-${groupId}-${childNode.id}`,
      source: groupId,
      target: childNode.id,
    });
  }

  applyDagreLayout(nodes, layoutEdges);

  // Shift all nodes by xOffset after layout
  for (const node of nodes) {
    node.position.x += xOffset;
  }

  return nodes;
}

// ─── Codebase group edge builder ─────────────────────────────────

/**
 * Builds group-to-group edges from file-level imports.
 * Deduplicates: only one edge per group pair.
 * Stores the number of file-level imports as `data.weight`.
 */
export function buildCodebaseGroupEdges(graph: CodebaseGraph): Edge[] {
  const fileToGroup = new Map<string, string>();
  for (const file of graph.files) {
    fileToGroup.set(file.path, `group-${file.group}`);
  }

  const edgeWeights = new Map<string, number>();
  const edgePairs = new Map<string, { source: string; target: string }>();

  for (const edge of graph.edges) {
    const sourceGroup = fileToGroup.get(edge.source);
    const targetGroup = fileToGroup.get(edge.target);
    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      const key = `${sourceGroup}->${targetGroup}`;
      edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
      if (!edgePairs.has(key)) {
        edgePairs.set(key, { source: sourceGroup, target: targetGroup });
      }
    }
  }

  const edges: Edge[] = [];
  for (const [key, pair] of edgePairs) {
    edges.push({
      id: `group-dep-${key}`,
      source: pair.source,
      target: pair.target,
      type: 'dataFlow',
      data: { weight: edgeWeights.get(key) ?? 1 },
    });
  }

  return edges;
}

// ─── Cross-layer edge builder ─────────────────────────────────────

/**
 * Builds edges connecting agent task nodes to codebase file group nodes
 * based on fileScope path matching.
 * Returns empty array when either layer has no nodes.
 */
export function buildCrossLayerEdges(
  agentNodes: AgentRFNode[],
  codebaseNodes: CodebaseRFNode[],
): Edge[] {
  if (agentNodes.length === 0 || codebaseNodes.length === 0) return [];

  const edges: Edge[] = [];

  const agentTaskNodes = agentNodes.filter(
    (n): n is AgentTaskNode =>
      n.type === 'agentTask' || n.type === 'guardian',
  );

  const groupNodes = codebaseNodes.filter(
    (n): n is FileGroupNode => n.type === 'fileGroup',
  );

  for (const agentNode of agentTaskNodes) {
    const { fileScope, status } = agentNode.data;
    const isLive = status === 'active';

    for (const scope of fileScope) {
      const matchedGroup = groupNodes.find((g) =>
        scope.includes(g.data.label),
      );

      if (matchedGroup) {
        edges.push({
          id: `agent-scope-${agentNode.id}-${matchedGroup.id}`,
          source: agentNode.id,
          target: matchedGroup.id,
          data: { isLive },
          type: 'agentScope',
        });
      }
    }
  }

  return edges;
}
