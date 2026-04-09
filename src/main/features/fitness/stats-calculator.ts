/**
 * Fitness statistics calculator
 *
 * Computes workout stats on-demand from raw workout data.
 */

import type { FitnessStats, Workout } from '@shared/types';

/** Get the ISO date string for today (YYYY-MM-DD) */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Get the start of the current week (Monday) as YYYY-MM-DD */
function startOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

/** Calculate total volume (weight * reps) across all exercises in a workout */
function workoutVolume(workout: Workout): number {
  let volume = 0;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      if (set.weight !== undefined && set.reps !== undefined) {
        volume += set.weight * set.reps;
      }
    }
  }
  return volume;
}

/** Calculate current streak of consecutive workout days ending at today */
function calculateStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;

  const workoutDates = new Set(workouts.map((w) => w.date));
  const todayStr = today();
  let streak = 0;
  const current = new Date(todayStr);

  // Check if we have a workout today or yesterday to start the streak
  if (!workoutDates.has(todayStr)) {
    current.setDate(current.getDate() - 1);
    if (!workoutDates.has(current.toISOString().split('T')[0])) {
      return 0;
    }
  }

  // Count consecutive days backwards
  while (workoutDates.has(current.toISOString().split('T')[0])) {
    streak += 1;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/** Calculate the longest streak ever */
function calculateLongestStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;

  const sortedDates = [...new Set(workouts.map((w) => w.date))].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const previous = new Date(sortedDates[i - 1]);
    const currentDate = new Date(sortedDates[i]);
    const diffDays = (currentDate.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

/** Find the most frequently performed exercise */
function findFavoriteExercise(workouts: Workout[]): string | undefined {
  const counts = new Map<string, number>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const name = exercise.name.toLowerCase();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  let maxCount = 0;
  let favorite: string | undefined;
  for (const [name, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      favorite = name;
    }
  }
  return favorite;
}

export function calculateStats(workouts: Workout[]): FitnessStats {
  const weekStart = startOfWeek();
  const workoutsThisWeek = workouts.filter((w) => w.date >= weekStart);

  const totalVolume = workouts.reduce((sum, w) => sum + workoutVolume(w), 0);
  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);

  return {
    totalWorkouts: workouts.length,
    workoutsThisWeek: workoutsThisWeek.length,
    totalVolume,
    currentStreak: calculateStreak(workouts),
    longestStreak: calculateLongestStreak(workouts),
    favoriteExercise: findFavoriteExercise(workouts),
    averageWorkoutDuration: workouts.length > 0 ? Math.round(totalDuration / workouts.length) : 0,
  };
}
