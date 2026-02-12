/**
 * Terminal query keys factory
 */
export const terminalKeys = {
  all: ['terminals'] as const,
  lists: () => [...terminalKeys.all, 'list'] as const,
  list: (projectPath?: string) => [...terminalKeys.lists(), projectPath ?? 'all'] as const,
};
