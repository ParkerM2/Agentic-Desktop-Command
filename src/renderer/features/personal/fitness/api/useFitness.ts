/**
 * React Query hooks for fitness
 */

import { type UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { FITNESS } from '@shared/ipc/fitness/channels';
import type {
  BodyMeasurement,
  Exercise,
  FitnessGoal,
  FitnessGoalType,
  MeasurementSource,
  WorkoutType,
} from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';

import { fitnessKeys } from './queryKeys';

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

/** Log a new workout */
export function useLogWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date: string;
      type: WorkoutType;
      duration: number;
      exercises: Exercise[];
      notes?: string;
      id?: string;
    }) => {
      const id = data.id ?? crypto.randomUUID();
      return ipc(FITNESS.LOG.WORKOUT, { ...data, id });
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.workouts() });
    },
  });
}

/** Update an existing workout */
export function useUpdateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      date?: string;
      type?: WorkoutType;
      duration?: number;
      exercises?: Exercise[];
      notes?: string;
    }) => ipc(FITNESS.UPDATE.WORKOUT, data),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.workouts() });
    },
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

interface UpdateMeasurementInput {
  id: string;
  date?: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  boneMass?: number;
  waterPercentage?: number;
  visceralFat?: number;
  source?: MeasurementSource;
}

/** Update an existing measurement */
export function useUpdateMeasurement(): UseMutationResult<BodyMeasurement, Error, UpdateMeasurementInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMeasurementInput) => ipc(FITNESS.UPDATE.MEASUREMENT, data),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.measurements() });
    },
  });
}

/** Delete a measurement */
export function useDeleteMeasurement(): UseMutationResult<{ success: boolean }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(FITNESS.DELETE.MEASUREMENT, { id }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.measurements() });
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

/** Log a body measurement */
export function useLogMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date: string;
      weight?: number;
      bodyFat?: number;
      muscleMass?: number;
      boneMass?: number;
      waterPercentage?: number;
      visceralFat?: number;
      source: MeasurementSource;
      id?: string;
    }) => {
      const id = data.id ?? crypto.randomUUID();
      return ipc(FITNESS.LOG.MEASUREMENT, { ...data, id });
    },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.measurements() });
    },
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

/** Update goal progress */
export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { goalId: string; current: number }) =>
      ipc(FITNESS.UPDATE['GOAL-PROGRESS'], data),
    onSuccess: () => {
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

interface UpdateGoalInput {
  id: string;
  type?: FitnessGoalType;
  target?: number;
  unit?: string;
  deadline?: string | null;
}

/** Update an existing goal's definition (type, target, unit, deadline) */
export function useUpdateGoal(): UseMutationResult<FitnessGoal, Error, UpdateGoalInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateGoalInput) => ipc(FITNESS.UPDATE.GOAL, data),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: fitnessKeys.goals() });
    },
  });
}
