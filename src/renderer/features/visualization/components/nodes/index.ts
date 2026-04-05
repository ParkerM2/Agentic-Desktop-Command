import { AgentTaskNode } from './AgentTaskNode';
import { FeatureGroupNode } from './FeatureGroupNode';
import { FileGroupNode } from './FileGroupNode';
import { FileNode } from './FileNode';
import { GuardianNode } from './GuardianNode';

import type { NodeTypes } from '@xyflow/react';

// IMPORTANT: Defined at module level — never inside a component.
// React Flow requires stable references; defining inside a component causes all nodes to remount on every render.
export const NODE_TYPES: NodeTypes = {
  agentTask: AgentTaskNode,
  featureGroup: FeatureGroupNode,
  file: FileNode,
  fileGroup: FileGroupNode,
  guardian: GuardianNode,
};

export { AgentTaskNode } from './AgentTaskNode';
export type { AgentStatus } from './AgentTaskNode';
export { FeatureGroupNode } from './FeatureGroupNode';
export { FileGroupNode, FileNode };
export { GuardianNode } from './GuardianNode';
