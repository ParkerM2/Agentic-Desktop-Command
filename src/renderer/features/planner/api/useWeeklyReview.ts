/**
 * React Query hooks for weekly review operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { plannerKeys } from './queryKeys';

/**
 * Get Monday of the week containing the given date (ISO string YYYY-MM-DD)
 */
function getWeekMonday(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  // Adjust so Monday = 0 (Sunday becomes 6)
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

/** Fetch weekly review data */
export function useWeeklyReview(startDate: string) {
  // Always normalize to Monday for consistent caching
  const mondayDate = getWeekMonday(startDate);

  return useQuery({
    queryKey: plannerKeys.week(mondayDate),
    queryFn: () => ipc('planner.getWeek', { startDate: mondayDate }),
    staleTime: 30_000,
  });
}

/** Generate/refresh weekly review summary */
export function useGenerateWeeklyReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (startDate: string) => {
      const mondayDate = getWeekMonday(startDate);
      return ipc('planner.generateWeeklyReview', { startDate: mondayDate });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(plannerKeys.week(data.weekStartDate), data);
    },
  });
}

/** Update weekly review reflection */
export function useUpdateWeeklyReflection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { startDate: string; reflection: string }) => {
      const mondayDate = getWeekMonday(input.startDate);
      return ipc('planner.updateWeeklyReflection', {
        startDate: mondayDate,
        reflection: input.reflection,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(plannerKeys.week(data.weekStartDate), data);
    },
  });
}
