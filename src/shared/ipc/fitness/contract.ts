/**
 * Fitness IPC Contract
 *
 * Invoke and event channel definitions for workout logging,
 * body measurements, fitness goals, and stats.
 */

import { z } from 'zod';

import { FITNESS, FITNESS_EVENTS } from './channels';
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
  [FITNESS.LOG.WORKOUT]: {
    input: z.object({
      id: z.string().optional(),
      date: z.string(),
      type: WorkoutTypeSchema,
      duration: z.number(),
      exercises: z.array(ExerciseSchema),
      notes: z.string().optional(),
    }),
    output: WorkoutSchema,
  },
  [FITNESS.LIST.WORKOUTS]: {
    input: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      type: WorkoutTypeSchema.optional(),
    }),
    output: z.array(WorkoutSchema),
  },
  [FITNESS.LOG.MEASUREMENT]: {
    input: z.object({
      id: z.string().optional(),
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
  [FITNESS.GET.MEASUREMENTS]: {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(BodyMeasurementSchema),
  },
  [FITNESS.GET.STATS]: {
    input: z.object({}),
    output: FitnessStatsSchema,
  },
  [FITNESS.SET.GOAL]: {
    input: z.object({
      id: z.string().optional(),
      type: FitnessGoalTypeSchema,
      target: z.number(),
      unit: z.string(),
      deadline: z.string().optional(),
    }),
    output: FitnessGoalSchema,
  },
  [FITNESS.LIST.GOALS]: {
    input: z.object({}),
    output: z.array(FitnessGoalSchema),
  },
  [FITNESS.UPDATE['GOAL-PROGRESS']]: {
    input: z.object({ goalId: z.string(), current: z.number() }),
    output: FitnessGoalSchema,
  },
  [FITNESS.DELETE.WORKOUT]: {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  [FITNESS.DELETE.GOAL]: {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/** Event channels for fitness-related events */
export const fitnessEvents = {
  [FITNESS_EVENTS.WORKOUT.CHANGED]: {
    payload: z.object({ workoutId: z.string() }),
  },
  [FITNESS_EVENTS.MEASUREMENT.CHANGED]: {
    payload: z.object({ measurementId: z.string() }),
  },
  [FITNESS_EVENTS.GOAL.CHANGED]: {
    payload: z.object({ goalId: z.string() }),
  },
} as const;
