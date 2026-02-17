/**
 * Fitness IPC — Barrel Export
 *
 * Re-exports all fitness-related schemas and contract definitions.
 */

export {
  BodyMeasurementSchema,
  ExerciseSchema,
  ExerciseSetSchema,
  FitnessGoalSchema,
  FitnessGoalTypeSchema,
  FitnessStatsSchema,
  MeasurementSourceSchema,
  WeightUnitSchema,
  WorkoutSchema,
  WorkoutTypeSchema,
} from './schemas';

export { fitnessEvents, fitnessInvoke } from './contract';
