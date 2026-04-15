/**
 * Idea query key factory
 */

import type { IdeaCategory, IdeaStatus } from '@shared/types';

export const ideaKeys = {
  all: ['ideas'] as const,
  lists: () => [...ideaKeys.all, 'list'] as const,
  list: (projectId?: string, status?: IdeaStatus, category?: IdeaCategory) =>
    [...ideaKeys.lists(), { projectId, status, category }] as const,
};
