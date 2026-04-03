/**
 * React Query hooks for planner operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ScheduledTask, TimeBlock } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { plannerKeys } from './queryKeys';

/** Fetch a daily plan */
export function useDay(date: string) {
  return useQuery({
    queryKey: plannerKeys.day(date),
    queryFn: () => ipc('planner.getDay', { date }),
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
    }) => ipc('planner.updateDay', input),
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
      ipc('planner.addTimeBlock', input),
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
    }) => ipc('planner.updateTimeBlock', input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: plannerKeys.day(variables.date) });
    },
  });
}

/** Remove a time block */
export function useRemoveTimeBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { date: string; blockId: string }) => ipc('planner.removeTimeBlock', input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: plannerKeys.day(variables.date) });
    },
  });
}
