/**
 * React Query hooks for ideas
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { IDEAS } from '@shared/ipc/misc/ideas.channels';
import type { Idea, IdeaCategory, IdeaStatus } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';
import { optimisticCreate, optimisticDelete } from '@renderer/shared/lib/optimistic';

import { ideaKeys } from './queryKeys';

/** Fetch ideas with optional filters */
export function useIdeas(projectId?: string, status?: IdeaStatus, category?: IdeaCategory) {
  return useQuery({
    queryKey: ideaKeys.list(projectId, status, category),
    queryFn: () => ipc(IDEAS.LIST.ALL, { projectId, status, category }),
  });
}

/** Create a new idea */
export function useCreateIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id?: string;
      title: string;
      description: string;
      category: IdeaCategory;
      tags?: string[];
      projectId?: string;
    }) => {
      const id = data.id ?? crypto.randomUUID();
      return ipc(IDEAS.CREATE.IDEA, { ...data, id });
    },
    ...optimisticCreate<
      {
        id?: string;
        title: string;
        description: string;
        category: IdeaCategory;
        tags?: string[];
        projectId?: string;
      },
      Idea
    >(queryClient, ideaKeys.lists(), (input) => ({
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      description: input.description,
      status: 'new' as const,
      category: input.category,
      tags: input.tags ?? [],
      projectId: input.projectId,
      votes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  });
}

/** Update an existing idea */
export function useUpdateIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      title?: string;
      description?: string;
      status?: IdeaStatus;
      category?: IdeaCategory;
      tags?: string[];
    }) => ipc(IDEAS.UPDATE.IDEA, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
    },
  });
}

/** Delete an idea */
export function useDeleteIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(IDEAS.DELETE.IDEA, { id }),
    ...optimisticDelete<Idea>(queryClient, ideaKeys.lists()),
  });
}

/** Vote on an idea */
export function useVoteIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; delta: number }) => ipc(IDEAS.VOTE.IDEA, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ideaKeys.lists() });
    },
  });
}
