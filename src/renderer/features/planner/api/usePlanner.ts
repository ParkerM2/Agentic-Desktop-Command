/**
 * React Query hooks for planner operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PLANNER } from '@shared/ipc/planner/channels';
import type { ScheduledTask, TimeBlock } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { plannerKeys } from './queryKeys';

/** Fetch a daily plan */
export function useDay(date: string) {
  return useQuery({
    queryKey: plannerKeys.day(date),
    queryFn: () => ipc(PLANNER.GET.DAY, { date }),
    staleTime: 30_000,
  });
}

/** Update a daily plan (goals, scheduled tasks, reflection) */
export function useUpdateDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      date: string;
      goals?: string[];
      completedGoals?: string[];
      scheduledTasks?: ScheduledTask[];
      reflection?: string;
    }) => ipc(PLANNER.UPDATE.DAY, input),
    onSuccess: (data) => {
      queryClient.setQueryData(plannerKeys.day(data.date), data);
    },
  });
}

/** Add a time block to a day */
export function useAddTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { date: string; timeBlock: Omit<TimeBlock, 'id'> }) =>
      ipc(PLANNER.ADD['TIME-BLOCK'], input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: plannerKeys.day(variables.date) });
    },
  });
}

/** Update a time block */
export function useUpdateTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      date: string;
      blockId: string;
      updates: Partial<Omit<TimeBlock, 'id'>>;
    }) => ipc(PLANNER.MODIFY['TIME-BLOCK'], input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: plannerKeys.day(variables.date) });
    },
  });
}

/** Remove a time block */
export function useRemoveTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { date: string; blockId: string }) => ipc(PLANNER.REMOVE['TIME-BLOCK'], input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: plannerKeys.day(variables.date) });
    },
  });
}
