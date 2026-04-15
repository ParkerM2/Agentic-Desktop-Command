/**
 * Alert query keys factory
 */
export const alertKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
  list: (includeExpired: boolean) => [...alertKeys.lists(), { includeExpired }] as const,
};
