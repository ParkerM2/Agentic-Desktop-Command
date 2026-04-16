/**
 * React Query hooks for fitness — query hooks
 * Mutation hooks live in useFitnessMutations.ts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { FITNESS } from '@shared/ipc/fitness/channels';
import type { FitnessGoalType, WorkoutType } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { fitnessKeys } from './queryKeys';

// Re-export mutation hooks so existing imports continue to resolve
export {
  useDeleteMeasurement,
  useLogMeasurement,
  useLogWorkout,
  useUpdateGoal,
  useUpdateGoalProgress,
  useUpdateMeasurement,
  useUpdateWorkout,
} from './useFitnessMutations';

/** List workouts with optional filters */
export function useWorkouts(filters?: {
  startDate?: string;
  endDate?: string;
  type?: WorkoutType;
}) {
  return useQuery({
    queryKey: fitnessKeys.workoutList(filters),
    queryFn: () => ipc(FITNESS.LIST.WORKOUTS, filters ?? {}),
  });
}

/** Delete a workout */
export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(FITNESS.DELETE.WORKOUT, { id }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.workouts() });
    },
  });
}

/** Get body measurements */
export function useMeasurements(limit?: number) {
  return useQuery({
    queryKey: fitnessKeys.measurementList(limit),
    queryFn: () => ipc(FITNESS.GET.MEASUREMENTS, { limit }),
  });
}

/** Get fitness stats */
export function useFitnessStats() {
  return useQuery({
    queryKey: fitnessKeys.stats(),
    queryFn: () => ipc(FITNESS.GET.STATS, {}),
  });
}

/** List fitness goals */
export function useFitnessGoals() {
  return useQuery({
    queryKey: fitnessKeys.goals(),
    queryFn: () => ipc(FITNESS.LIST.GOALS, {}),
  });
}

/** Set a new fitness goal */
export function useSetGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: FitnessGoalType;
      target: number;
      unit: string;
      deadline?: string;
      id?: string;
    }) => {
      const id = data.id ?? crypto.randomUUID();
      return ipc(FITNESS.SET.GOAL, { ...data, id });
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.goals() });
    },
  });
}

/** Delete a goal */
export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(FITNESS.DELETE.GOAL, { id }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.goals() });
    },
  });
}
