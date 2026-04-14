/**
 * Node content renderer — maps node type to the appropriate detail component.
 */

import type { ReactNode } from 'react';


import type { AgentTaskInfoSchema, CodebaseFileSchema } from '@shared/ipc/visualization/schemas';

import { AgentDetail } from './AgentDetail';
import { FeatureGroupDetail } from './FeatureGroupDetail';
import { FileDetail } from './FileDetail';
import { FileGroupDetail } from './FileGroupDetail';
import { GuardianDetail } from './GuardianDetail';

import type { TrackingEvent } from './types';
import type {
  AgentTaskData,
  FeatureGroupData,
  FileGroupData,
  FileNodeData,
} from '../../../lib/graph-builders';
import type { Node } from '@xyflow/react';
import type { z } from 'zod';

type AgentTaskInfo = z.infer<typeof AgentTaskInfoSchema>;
type CodebaseFile = z.infer<typeof CodebaseFileSchema>;

// ─── Panel title ────────────────────────────────────────────────────────────

export function getPanelTitle(node: Node | undefined): string {
  if (node === undefined) return 'Node Detail';
  switch (node.type) {
    case 'file': {
      return (node.data as unknown as FileNodeData).label;
    }
    case 'fileGroup': {
      return (node.data as unknown as FileGroupData).label;
    }
    case 'agentTask':
    case 'guardian': {
      return (node.data as unknown as AgentTaskData).agentName;
    }
    case 'featureGroup': {
      return (node.data as unknown as FeatureGroupData).label;
    }
    case undefined:
    default: {
      return 'Node Detail';
    }
  }
}

// ─── Content context ────────────────────────────────────────────────────────

export interface NodeContentContext {
  agentTeamsLoading: boolean;
  featureAgentTasks: AgentTaskInfo[];
  featureEvents: TrackingEvent[];
  featureFiles: CodebaseFile[];
  featureName: string;
  getFileEdges: (path: string) => { exports: string[]; imports: string[] };
  projectId: string;
}

// ─── Content renderer ───────────────────────────────────────────────────────

export function renderNodeContent(
  node: Node | undefined,
  ctx: NodeContentContext,
): ReactNode {
  if (node === undefined) return null;
  const {
    agentTeamsLoading,
    featureAgentTasks,
    featureEvents,
    featureFiles,
    featureName,
    getFileEdges,
    projectId,
  } = ctx;

  switch (node.type) {
    case 'file': {
      const data = node.data as unknown as FileNodeData;
      const edges = getFileEdges(data.path);
      return <FileDetail data={data} exports={edges.exports} imports={edges.imports} />;
    }
    case 'fileGroup': {
      return <FileGroupDetail data={node.data as unknown as FileGroupData} />;
    }
    case 'agentTask': {
      return (
        <AgentDetail
          data={node.data as unknown as AgentTaskData}
          events={featureEvents}
          eventsLoading={agentTeamsLoading}
          feature={featureName}
          projectId={projectId}
        />
      );
    }
    case 'guardian': {
      return (
        <GuardianDetail
          data={node.data as unknown as AgentTaskData}
          events={featureEvents}
          eventsLoading={agentTeamsLoading}
        />
      );
    }
    case 'featureGroup': {
      return (
        <FeatureGroupDetail
          agentTasks={featureAgentTasks}
          data={node.data as unknown as FeatureGroupData}
          files={featureFiles}
          projectId={projectId}
        />
      );
    }
    case undefined:
    default: {
      return null;
    }
  }
}
