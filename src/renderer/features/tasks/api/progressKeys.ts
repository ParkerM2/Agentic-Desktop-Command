/**
 * Progress query keys factory
 *
 * Hierarchical key structure for progress pipeline tasks.
 * Used by useProgress query hooks and useProgressMutations for
 * targeted cache invalidation.
 */
export const progressKeys = {
  all: ['progress'] as const,
  list: () => [...progressKeys.all, 'list'] as const,
  detail: (slug: string) => [...progressKeys.all, 'detail', slug] as const,
  archived: () => [...progressKeys.all, 'archived'] as const,
  sessions: () => [...progressKeys.all, 'sessions'] as const,
};
