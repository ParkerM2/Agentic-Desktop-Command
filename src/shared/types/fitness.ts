/**
 * Fitness-related types
 */

export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'sport';

export type WeightUnit = 'lbs' | 'kg';

export type MeasurementSource = 'manual';

export type FitnessGoalType = 'weight' | 'workout_frequency' | 'lift_target' | 'cardio_target';

export interface ExerciseSet {
  reps?: number;
  weight?: number;
  unit?: WeightUnit;
  duration?: number;
  distance?: number;
}

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
  muscleGroup?: string;
}

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  duration: number;
  exercises: Exercise[];
  notes?: string;
  createdAt: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  boneMass?: number;
  waterPercentage?: number;
  visceralFat?: number;
  source: MeasurementSource;
  createdAt: string;
}

export interface FitnessGoal {
  id: string;
  type: FitnessGoalType;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
  createdAt: string;
}

export interface FitnessStats {
  totalWorkouts: number;
  workoutsThisWeek: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  favoriteExercise?: string;
  averageWorkoutDuration: number;
}
