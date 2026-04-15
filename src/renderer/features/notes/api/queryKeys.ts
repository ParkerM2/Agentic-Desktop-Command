/**
 * Notes query key factory
 */

export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (projectId?: string, tag?: string) => [...noteKeys.lists(), { projectId, tag }] as const,
  search: (query: string) => [...noteKeys.all, 'search', query] as const,
};
