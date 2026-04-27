/**
 * React Query mutation hooks for fitness
 */

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

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
