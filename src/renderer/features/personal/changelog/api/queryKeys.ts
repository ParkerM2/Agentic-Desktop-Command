/**
 * Changelog query key factory
 */

export const changelogKeys = {
  all: ['changelog'] as const,
  list: () => [...changelogKeys.all, 'list'] as const,
};
