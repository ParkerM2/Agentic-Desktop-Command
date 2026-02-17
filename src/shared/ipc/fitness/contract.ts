/**
 * Fitness IPC Contract
 *
 * Invoke and event channel definitions for workout logging,
 * body measurements, fitness goals, and stats.
 */

import { z } from 'zod';

import {
  BodyMeasurementSchema,
  ExerciseSchema,
  FitnessGoalSchema,
  FitnessGoalTypeSchema,
  FitnessStatsSchema,
  MeasurementSourceSchema,
  WorkoutSchema,
  WorkoutTypeSchema,
} from './schemas';

/** Invoke channels for fitness operations */
export const fitnessInvoke = {
  'fitness.logWorkout': {
    input: z.object({
      date: z.string(),
      type: WorkoutTypeSchema,
      duration: z.number(),
      exercises: z.array(ExerciseSchema),
      notes: z.string().optional(),
    }),
    output: WorkoutSchema,
  },
  'fitness.listWorkouts': {
    input: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      type: WorkoutTypeSchema.optional(),
    }),
    output: z.array(WorkoutSchema),
  },
  'fitness.logMeasurement': {
    input: z.object({
      date: z.string(),
      weight: z.number().optional(),
      bodyFat: z.number().optional(),
      muscleMass: z.number().optional(),
      boneMass: z.number().optional(),
      waterPercentage: z.number().optional(),
      visceralFat: z.number().optional(),
      source: MeasurementSourceSchema,
    }),
    output: BodyMeasurementSchema,
  },
  'fitness.getMeasurements': {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(BodyMeasurementSchema),
  },
  'fitness.getStats': {
    input: z.object({}),
    output: FitnessStatsSchema,
  },
  'fitness.setGoal': {
    input: z.object({
      type: FitnessGoalTypeSchema,
      target: z.number(),
      unit: z.string(),
      deadline: z.string().optional(),
    }),
    output: FitnessGoalSchema,
  },
  'fitness.listGoals': {
    input: z.object({}),
    output: z.array(FitnessGoalSchema),
  },
  'fitness.updateGoalProgress': {
    input: z.object({ goalId: z.string(), current: z.number() }),
    output: FitnessGoalSchema,
  },
  'fitness.deleteWorkout': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'fitness.deleteGoal': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Event channels for fitness-related events */
export const fitnessEvents = {
  'event:fitness.workoutChanged': {
    payload: z.object({ workoutId: z.string() }),
  },
  'event:fitness.measurementChanged': {
    payload: z.object({ measurementId: z.string() }),
  },
  'event:fitness.goalChanged': {
    payload: z.object({ goalId: z.string() }),
  },
} as const;
