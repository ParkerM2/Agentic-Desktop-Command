import { AgentScopeEdge } from './AgentScopeEdge';
import { DataFlowEdge } from './DataFlowEdge';

export { AgentScopeEdge } from './AgentScopeEdge';
export { DataFlowEdge } from './DataFlowEdge';

export const EDGE_TYPES = {
  dataFlow: DataFlowEdge,
  agentScope: AgentScopeEdge,
} as const;
