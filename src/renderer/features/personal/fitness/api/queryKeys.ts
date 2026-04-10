/**
 * Fitness query key factory
 */

export const fitnessKeys = {
  all: ['fitness'] as const,
  workouts: () => [...fitnessKeys.all, 'workouts'] as const,
  workoutList: (filters?: { startDate?: string; endDate?: string; type?: string }) =>
    [...fitnessKeys.workouts(), filters] as const,
  measurements: () => [...fitnessKeys.all, 'measurements'] as const,
  measurementList: (limit?: number) => [...fitnessKeys.measurements(), { limit }] as const,
  stats: () => [...fitnessKeys.all, 'stats'] as const,
  goals: () => [...fitnessKeys.all, 'goals'] as const,
};
