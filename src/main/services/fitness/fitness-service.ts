/**
 * Fitness Service — Workout logging, body measurements, goals, and stats
 *
 * Data persisted to JSON files in the app's user data directory.
 * All methods are synchronous; IPC handlers wrap with Promise.resolve().
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  BodyMeasurement,
  Exercise,
  FitnessGoal,
  FitnessGoalType,
  FitnessStats,
  MeasurementSource,
  Workout,
  WorkoutType,
} from '@shared/types';

import type { ReinitializableService } from '@main/services/data-management';

import { calculateStats } from './stats-calculator';

import type { IpcRouter } from '../../ipc/router';

// ── Interface ────────────────────────────────────────────────

export interface FitnessService extends ReinitializableService {
  logWorkout: (data: {
    date: string;
    type: WorkoutType;
    duration: number;
    exercises: Exercise[];
    notes?: string;
  }) => Workout;
  listWorkouts: (filters?: {
    startDate?: string;
    endDate?: string;
    type?: WorkoutType;
  }) => Workout[];
  deleteWorkout: (id: string) => { success: boolean };
  logMeasurement: (data: {
    date: string;
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
    boneMass?: number;
    waterPercentage?: number;
    visceralFat?: number;
    source: MeasurementSource;
  }) => BodyMeasurement;
  getMeasurements: (limit?: number) => BodyMeasurement[];
  getStats: () => FitnessStats;
  setGoal: (data: {
    type: FitnessGoalType;
    target: number;
    unit: string;
    deadline?: string;
  }) => FitnessGoal;
  listGoals: () => FitnessGoal[];
  updateGoalProgress: (goalId: string, current: number) => FitnessGoal;
  deleteGoal: (id: string) => { success: boolean };
}

// ── Persistence helpers ──────────────────────────────────────

interface StoreData<T> {
  items: T[];
}

function loadJson<T>(filePath: string): StoreData<T> {
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown as Partial<StoreData<T>>;
      return { items: Array.isArray(parsed.items) ? parsed.items : [] };
    } catch {
      return { items: [] };
    }
  }
  return { items: [] };
}

function saveJson<T>(filePath: string, data: StoreData<T>): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Factory ──────────────────────────────────────────────────

export function createFitnessService(deps: { dataDir: string; router: IpcRouter }): FitnessService {
  // Mutable directory path for user-scoping
  let fitnessDir = join(deps.dataDir, 'fitness');

  // Helper to get current file paths
  function getWorkoutsPath(): string {
    return join(fitnessDir, 'workouts.json');
  }
  function getMeasurementsPath(): string {
    return join(fitnessDir, 'measurements.json');
  }
  function getGoalsPath(): string {
    return join(fitnessDir, 'goals.json');
  }

  // In-memory caches
  let workouts = loadJson<Workout>(getWorkoutsPath());
  let measurements = loadJson<BodyMeasurement>(getMeasurementsPath());
  let goals = loadJson<FitnessGoal>(getGoalsPath());

  function persistWorkouts(): void {
    saveJson(getWorkoutsPath(), workouts);
  }

  function persistMeasurements(): void {
    saveJson(getMeasurementsPath(), measurements);
  }

  function persistGoals(): void {
    saveJson(getGoalsPath(), goals);
  }

  return {
    logWorkout(data) {
      const workout: Workout = {
        id: randomUUID(),
        date: data.date,
        type: data.type,
        duration: data.duration,
        exercises: data.exercises,
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };
      workouts.items.push(workout);
      persistWorkouts();
      deps.router.emit('event:fitness.workoutChanged', { workoutId: workout.id });
      return workout;
    },

    listWorkouts(filters) {
      let result = [...workouts.items];

      if (filters?.startDate) {
        result = result.filter((w) => w.date >= (filters.startDate ?? ''));
      }
      if (filters?.endDate) {
        result = result.filter((w) => w.date <= (filters.endDate ?? ''));
      }
      if (filters?.type) {
        result = result.filter((w) => w.type === filters.type);
      }

      result.sort((a, b) => b.date.localeCompare(a.date));
      return result;
    },

    deleteWorkout(id) {
      const index = workouts.items.findIndex((w) => w.id === id);
      if (index === -1) {
        throw new Error(`Workout not found: ${id}`);
      }
      workouts.items.splice(index, 1);
      persistWorkouts();
      deps.router.emit('event:fitness.workoutChanged', { workoutId: id });
      return { success: true };
    },

    logMeasurement(data) {
      // Deduplicate by date — keep latest entry
      const existingIndex = measurements.items.findIndex((m) => m.date === data.date);

      const measurement: BodyMeasurement = {
        id: randomUUID(),
        date: data.date,
        weight: data.weight,
        bodyFat: data.bodyFat,
        muscleMass: data.muscleMass,
        boneMass: data.boneMass,
        waterPercentage: data.waterPercentage,
        visceralFat: data.visceralFat,
        source: data.source,
        createdAt: new Date().toISOString(),
      };

      if (existingIndex === -1) {
        measurements.items.push(measurement);
      } else {
        measurements.items[existingIndex] = measurement;
      }

      persistMeasurements();
      deps.router.emit('event:fitness.measurementChanged', { measurementId: measurement.id });
      return measurement;
    },

    getMeasurements(limit) {
      const sorted = [...measurements.items].sort((a, b) => b.date.localeCompare(a.date));
      return limit === undefined ? sorted : sorted.slice(0, limit);
    },

    getStats() {
      return calculateStats(workouts.items);
    },

    setGoal(data) {
      const goal: FitnessGoal = {
        id: randomUUID(),
        type: data.type,
        target: data.target,
        current: 0,
        unit: data.unit,
        deadline: data.deadline,
        createdAt: new Date().toISOString(),
      };
      goals.items.push(goal);
      persistGoals();
      deps.router.emit('event:fitness.goalChanged', { goalId: goal.id });
      return goal;
    },

    listGoals() {
      return [...goals.items];
    },

    updateGoalProgress(goalId, current) {
      const index = goals.items.findIndex((g) => g.id === goalId);
      if (index === -1) {
        throw new Error(`Goal not found: ${goalId}`);
      }
      goals.items[index] = { ...goals.items[index], current };
      persistGoals();
      deps.router.emit('event:fitness.goalChanged', { goalId });
      return goals.items[index];
    },

    deleteGoal(id) {
      const index = goals.items.findIndex((g) => g.id === id);
      if (index === -1) {
        throw new Error(`Goal not found: ${id}`);
      }
      goals.items.splice(index, 1);
      persistGoals();
      deps.router.emit('event:fitness.goalChanged', { goalId: id });
      return { success: true };
    },

    reinitialize(dataDir: string) {
      fitnessDir = join(dataDir, 'fitness');
      // Reload data from new directory
      workouts = loadJson<Workout>(getWorkoutsPath());
      measurements = loadJson<BodyMeasurement>(getMeasurementsPath());
      goals = loadJson<FitnessGoal>(getGoalsPath());
    },

    clearState() {
      workouts = { items: [] };
      measurements = { items: [] };
      goals = { items: [] };
    },
  };
}
