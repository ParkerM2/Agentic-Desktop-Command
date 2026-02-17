/**
 * Fitness IPC Schemas
 *
 * Zod schemas for workout logging, body measurements,
 * fitness goals, and stats tracking.
 */

import { z } from 'zod';

export const WorkoutTypeSchema = z.enum(['strength', 'cardio', 'flexibility', 'sport']);
export const WeightUnitSchema = z.enum(['lbs', 'kg']);
export const MeasurementSourceSchema = z.enum(['manual']);
export const FitnessGoalTypeSchema = z.enum([
  'weight',
  'workout_frequency',
  'lift_target',
  'cardio_target',
]);

export const ExerciseSetSchema = z.object({
  reps: z.number().optional(),
  weight: z.number().optional(),
  unit: WeightUnitSchema.optional(),
  duration: z.number().optional(),
  distance: z.number().optional(),
});

export const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.array(ExerciseSetSchema),
  muscleGroup: z.string().optional(),
});

export const WorkoutSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: WorkoutTypeSchema,
  duration: z.number(),
  exercises: z.array(ExerciseSchema),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const BodyMeasurementSchema = z.object({
  id: z.string(),
  date: z.string(),
  weight: z.number().optional(),
  bodyFat: z.number().optional(),
  muscleMass: z.number().optional(),
  boneMass: z.number().optional(),
  waterPercentage: z.number().optional(),
  visceralFat: z.number().optional(),
  source: MeasurementSourceSchema,
  createdAt: z.string(),
});

export const FitnessGoalSchema = z.object({
  id: z.string(),
  type: FitnessGoalTypeSchema,
  target: z.number(),
  current: z.number(),
  unit: z.string(),
  deadline: z.string().optional(),
  createdAt: z.string(),
});

export const FitnessStatsSchema = z.object({
  totalWorkouts: z.number(),
  workoutsThisWeek: z.number(),
  totalVolume: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  favoriteExercise: z.string().optional(),
  averageWorkoutDuration: z.number(),
});
