export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (projectId: string) => [...agentKeys.lists(), projectId] as const,
};
