/**
 * Progress query keys factory
 *
 * Hierarchical key structure for progress pipeline tasks.
 * Used by useProgress query hooks and useProgressMutations for
 * targeted cache invalidation.
 */
export const progressKeys = {
  all: ['progress'] as const,
  lists: () => [...progressKeys.all, 'list'] as const,
  list: (projectId?: string) => [...progressKeys.all, 'list', projectId ?? 'all'] as const,
  detail: (slug: string) => [...progressKeys.all, 'detail', slug] as const,
  archived: () => [...progressKeys.all, 'archived'] as const,
  sessions: () => [...progressKeys.all, 'sessions'] as const,
};
