/**
 * React Query hooks for milestones
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { MILESTONES } from '@shared/ipc/misc/milestones.channels';
import type { Milestone, MilestoneStatus } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';
import { optimisticCreate, optimisticDelete } from '@renderer/shared/lib/optimistic';

import { milestoneKeys } from './queryKeys';

/** Fetch milestones with optional project filter */
export function useMilestones(projectId?: string) {
  return useQuery({
    queryKey: milestoneKeys.list(projectId),
    queryFn: () => ipc(MILESTONES.LIST.ALL, { projectId }),
  });
}

/** Create a new milestone */
export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      targetDate: string;
      projectId?: string;
      id?: string;
    }) => {
      const id = data.id ?? crypto.randomUUID();
      return ipc(MILESTONES.CREATE.MILESTONE, { ...data, id });
    },
    ...optimisticCreate<
      {
        title: string;
        description: string;
        targetDate: string;
        projectId?: string;
        id?: string;
      },
      Milestone
    >(queryClient, milestoneKeys.lists(), (input) => ({
      id: input.id ?? '',
      title: input.title,
      description: input.description,
      targetDate: input.targetDate,
      status: 'planned' as const,
      tasks: [],
      projectId: input.projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  });
}

/** Update a milestone */
export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      title?: string;
      description?: string;
      targetDate?: string;
      status?: MilestoneStatus;
    }) => ipc(MILESTONES.UPDATE.MILESTONE, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
    },
  });
}

/** Delete a milestone */
export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(MILESTONES.DELETE.MILESTONE, { id }),
    ...optimisticDelete<Milestone>(queryClient, milestoneKeys.lists()),
  });
}

/** Add a task to a milestone */
export function useAddMilestoneTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { milestoneId: string; title: string }) => ipc(MILESTONES.ADD.TASK, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
    },
  });
}

/** Toggle a milestone task's completion */
export function useToggleMilestoneTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { milestoneId: string; taskId: string }) =>
      ipc(MILESTONES.TOGGLE.TASK, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: milestoneKeys.lists() });
    },
  });
}
