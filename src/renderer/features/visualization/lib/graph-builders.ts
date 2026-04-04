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

export interface FeatureGroupData {
  type: 'featureGroup';
  label: string;
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
  status: string;
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

// ─── Codebase graph builder ───────────────────────────────────────

/**
 * Transforms a CodebaseGraph into React Flow nodes.
 * Returns parent fileGroup nodes before child file nodes.
 */
export function buildCodebaseRFNodes(graph: CodebaseGraph): CodebaseRFNode[] {
  const nodes: CodebaseRFNode[] = [];

  for (const groupName of graph.groups) {
    const groupId = `group-${groupName}`;

    const groupNode: FileGroupNode = {
      id: groupId,
      type: 'fileGroup',
      position: { x: 0, y: 0 },
      data: {
        type: 'fileGroup',
        label: groupName,
        fileCount: graph.files.filter((f) => f.group === groupName).length,
      },
    };
    nodes.push(groupNode);

    const filesInGroup = graph.files.filter((f) => f.group === groupName);
    for (const file of filesInGroup) {
      const fileNode: FileNode = {
        id: file.path,
        type: 'file',
        parentId: groupId,
        extent: 'parent',
        position: { x: 0, y: 0 },
        data: {
          type: 'file',
          label: file.fileName,
          path: file.path,
          relativePath: file.relativePath,
          ext: file.ext,
          importCount: file.importCount,
          group: file.group,
        },
      };
      nodes.push(fileNode);
    }
  }

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
  const groupId = `feature-${featureName}`;

  const groupNode: FeatureGroupNode = {
    id: groupId,
    type: 'featureGroup',
    position: { x: xOffset, y: 0 },
    data: {
      type: 'featureGroup',
      label: featureName,
      status: featureData.status,
      branch: featureData.branch,
      agentCount: featureData.agentCount,
    },
  };
  nodes.push(groupNode);

  let childIndex = 0;
  for (const task of featureData.tasks) {
    const nodeType = task.isGuardian ? 'guardian' : 'agentTask';
    const childNode: AgentTaskNode = {
      id: `agent-${task.agentName}`,
      type: nodeType,
      parentId: groupId,
      extent: 'parent',
      position: { x: xOffset, y: childIndex * 80 },
      data: {
        type: nodeType,
        label: task.taskName ?? task.agentName,
        agentName: task.agentName,
        taskNumber: task.taskNumber,
        taskName: task.taskName,
        agentRole: task.agentRole,
        wave: task.wave,
        status: task.status,
        fileScope: task.fileScope,
        eventCount: task.eventCount,
        isGuardian: task.isGuardian,
      },
    };
    nodes.push(childNode);
    childIndex++;
  }

  return nodes;
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
          type: 'crossLayer',
        });
      }
    }
  }

  return edges;
}
