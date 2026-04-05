/**
 * Visualization query keys factory
 */
export const visualizationKeys = {
  all: ['visualization'] as const,
  codebaseGraph: (projectId: string) => [...visualizationKeys.all, 'codebase', projectId] as const,
  agentTeams: (projectId: string) => [...visualizationKeys.all, 'agents', projectId] as const,
  sessionLog: (projectId: string, feature: string, agentName: string, cursor?: number) =>
    [...visualizationKeys.all, 'session', projectId, feature, agentName, cursor] as const,
};
