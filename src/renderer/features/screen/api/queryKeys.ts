/**
 * Screen capture query key factory
 */

export const screenKeys = {
  all: ['screen'] as const,
  sources: () => [...screenKeys.all, 'sources'] as const,
  sourcesWithOptions: (types?: string[], thumbnailSize?: { width: number; height: number }) =>
    [...screenKeys.sources(), { types, thumbnailSize }] as const,
  permission: () => [...screenKeys.all, 'permission'] as const,
};
