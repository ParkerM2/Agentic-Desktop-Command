/**
 * Fitness Service — Workout logging, body measurements, goals, and stats
 *
 * Data persisted to SQLite via Drizzle ORM (workouts, bodyMeasurements, fitnessGoals tables).
 * One-time migration from legacy JSON files on first access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { and, desc, eq, gte, lte } from 'drizzle-orm';

import { FITNESS_EVENTS } from '@shared/ipc/fitness/channels';
import { generateId } from '@shared/lib/id';
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

import { bodyMeasurements, fitnessGoals, workouts } from '../../db/schema';
import { createScopedLogger } from '../../lib/logger';

import { calculateStats } from './stats-calculator';

import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

const logger = createScopedLogger('fitness-service');

// ── Interface ────────────────────────────────────────────────

export interface FitnessService {
  logWorkout: (data: {
    id?: string;
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
  updateWorkout: (data: {
    id: string;
    date?: string;
    type?: WorkoutType;
    duration?: number;
    exercises?: Exercise[];
    notes?: string;
  }) => Workout;
  deleteWorkout: (id: string) => { success: boolean };
  logMeasurement: (data: {
    id?: string;
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
    id?: string;
    type: FitnessGoalType;
    target: number;
    unit: string;
    deadline?: string;
  }) => FitnessGoal;
  listGoals: () => FitnessGoal[];
  updateGoalProgress: (goalId: string, current: number) => FitnessGoal;
  deleteGoal: (id: string) => { success: boolean };
}

// ── JSON migration helpers ──────────────────────────────────

interface StoreData<T> {
  items: T[];
}

function migrateFromJson(db: AdcDatabase, dataDir: string): void {
  const fitnessDir = join(dataDir, 'fitness');

  // ── Workouts ──
  migrateWorkouts(db, fitnessDir);

  // ── Measurements ──
  migrateMeasurements(db, fitnessDir);

  // ── Goals ──
  migrateGoals(db, fitnessDir);
}

function migrateWorkouts(db: AdcDatabase, fitnessDir: string): void {
  const existing = db.select().from(workouts).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(fitnessDir, 'workouts.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreData<Workout>>;
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    for (const item of items) {
      db.insert(workouts).values({
        id: item.id,
        date: item.date,
        type: item.type,
        duration: item.duration,
        exercises: item.exercises as unknown[],
        notes: item.notes ?? null,
        createdAt: item.createdAt,
      }).run();
    }
    logger.info(`Migrated ${String(items.length)} workouts from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate workouts from JSON:', err);
  }
}

function migrateMeasurements(db: AdcDatabase, fitnessDir: string): void {
  const existing = db.select().from(bodyMeasurements).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(fitnessDir, 'measurements.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreData<BodyMeasurement>>;
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    for (const item of items) {
      db.insert(bodyMeasurements).values({
        id: item.id,
        date: item.date,
        weight: item.weight === undefined ? null : Math.round(item.weight),
        bodyFat: item.bodyFat === undefined ? null : Math.round(item.bodyFat),
        muscleMass: item.muscleMass === undefined ? null : Math.round(item.muscleMass),
        boneMass: item.boneMass === undefined ? null : Math.round(item.boneMass),
        waterPercentage: item.waterPercentage === undefined ? null : Math.round(item.waterPercentage),
        visceralFat: item.visceralFat === undefined ? null : Math.round(item.visceralFat),
        source: item.source,
        createdAt: item.createdAt,
      }).run();
    }
    logger.info(`Migrated ${String(items.length)} measurements from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate measurements from JSON:', err);
  }
}

function migrateGoals(db: AdcDatabase, fitnessDir: string): void {
  const existing = db.select().from(fitnessGoals).limit(1).all();
  if (existing.length > 0) return;

  const jsonPath = join(fitnessDir, 'goals.json');
  if (!existsSync(jsonPath)) return;

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreData<FitnessGoal>>;
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    for (const item of items) {
      db.insert(fitnessGoals).values({
        id: item.id,
        type: item.type,
        target: Math.round(item.target),
        current: Math.round(item.current),
        unit: item.unit,
        deadline: item.deadline ?? null,
        createdAt: item.createdAt,
      }).run();
    }
    logger.info(`Migrated ${String(items.length)} fitness goals from JSON to SQLite`);
  } catch (err) {
    logger.error('Failed to migrate fitness goals from JSON:', err);
  }
}

// ── Row → Domain mappers ────────────────────────────────────

function toWorkout(row: typeof workouts.$inferSelect): Workout {
  return {
    id: row.id,
    date: row.date,
    type: row.type as WorkoutType,
    duration: row.duration ?? 0,
    exercises: row.exercises as Exercise[],
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
  };
}

function toMeasurement(row: typeof bodyMeasurements.$inferSelect): BodyMeasurement {
  return {
    id: row.id,
    date: row.date,
    weight: row.weight ?? undefined,
    bodyFat: row.bodyFat ?? undefined,
    muscleMass: row.muscleMass ?? undefined,
    boneMass: row.boneMass ?? undefined,
    waterPercentage: row.waterPercentage ?? undefined,
    visceralFat: row.visceralFat ?? undefined,
    source: (row.source ?? 'manual') as MeasurementSource,
    createdAt: row.createdAt,
  };
}

function toGoal(row: typeof fitnessGoals.$inferSelect): FitnessGoal {
  return {
    id: row.id,
    type: row.type as FitnessGoalType,
    target: row.target,
    current: row.current,
    unit: row.unit,
    deadline: row.deadline ?? undefined,
    createdAt: row.createdAt,
  };
}

// ── Factory ──────────────────────────────────────────────────

export function createFitnessService(deps: {
  db: AdcDatabase;
  router: IpcRouter;
  dataDir: string;
}): FitnessService {
  const { db, router, dataDir } = deps;

  migrateFromJson(db, dataDir);

  return {
    logWorkout(data) {
      const id = data.id ?? generateId();
      const createdAt = new Date().toISOString();

      db.insert(workouts).values({
        id,
        date: data.date,
        type: data.type,
        duration: data.duration,
        exercises: data.exercises as unknown[],
        notes: data.notes ?? null,
        createdAt,
      }).run();

      const workout: Workout = {
        id,
        date: data.date,
        type: data.type,
        duration: data.duration,
        exercises: data.exercises,
        notes: data.notes,
        createdAt,
      };

      router.emit(FITNESS_EVENTS.WORKOUT.CHANGED, { workoutId: id });
      return workout;
    },

    updateWorkout(data) {
      const updates: Partial<typeof workouts.$inferInsert> = {};
      if (data.date !== undefined) updates.date = data.date;
      if (data.type !== undefined) updates.type = data.type;
      if (data.duration !== undefined) updates.duration = data.duration;
      if (data.exercises !== undefined) updates.exercises = data.exercises as unknown[];
      if ('notes' in data) updates.notes = data.notes ?? null;

      const result = db.update(workouts).set(updates).where(eq(workouts.id, data.id)).run();
      if (result.changes === 0) {
        throw new Error(`Workout not found: ${data.id}`);
      }

      const [row] = db.select().from(workouts).where(eq(workouts.id, data.id)).all();
      router.emit(FITNESS_EVENTS.WORKOUT.CHANGED, { workoutId: data.id });
      return toWorkout(row);
    },

    listWorkouts(filters) {
      const conditions = [];

      if (filters?.startDate) {
        conditions.push(gte(workouts.date, filters.startDate));
      }
      if (filters?.endDate) {
        conditions.push(lte(workouts.date, filters.endDate));
      }
      if (filters?.type) {
        conditions.push(eq(workouts.type, filters.type));
      }

      const query = db.select().from(workouts);
      const rows = conditions.length > 0
        ? query.where(and(...conditions)).orderBy(desc(workouts.date)).all()
        : query.orderBy(desc(workouts.date)).all();

      return rows.map(toWorkout);
    },

    deleteWorkout(id) {
      const result = db.delete(workouts).where(eq(workouts.id, id)).run();
      if (result.changes === 0) {
        throw new Error(`Workout not found: ${id}`);
      }
      router.emit(FITNESS_EVENTS.WORKOUT.CHANGED, { workoutId: id });
      return { success: true };
    },

    logMeasurement(data) {
      // Deduplicate by date — delete existing entry for same date
      db.delete(bodyMeasurements).where(eq(bodyMeasurements.date, data.date)).run();

      const id = data.id ?? generateId();
      const createdAt = new Date().toISOString();

      db.insert(bodyMeasurements).values({
        id,
        date: data.date,
        weight: data.weight === undefined ? null : Math.round(data.weight),
        bodyFat: data.bodyFat === undefined ? null : Math.round(data.bodyFat),
        muscleMass: data.muscleMass === undefined ? null : Math.round(data.muscleMass),
        boneMass: data.boneMass === undefined ? null : Math.round(data.boneMass),
        waterPercentage: data.waterPercentage === undefined ? null : Math.round(data.waterPercentage),
        visceralFat: data.visceralFat === undefined ? null : Math.round(data.visceralFat),
        source: data.source,
        createdAt,
      }).run();

      const measurement: BodyMeasurement = {
        id,
        date: data.date,
        weight: data.weight,
        bodyFat: data.bodyFat,
        muscleMass: data.muscleMass,
        boneMass: data.boneMass,
        waterPercentage: data.waterPercentage,
        visceralFat: data.visceralFat,
        source: data.source,
        createdAt,
      };

      router.emit(FITNESS_EVENTS.MEASUREMENT.CHANGED, { measurementId: id });
      return measurement;
    },

    getMeasurements(limit) {
      const query = db.select().from(bodyMeasurements)
        .orderBy(desc(bodyMeasurements.date));

      const rows = limit === undefined
        ? query.all()
        : query.limit(limit).all();

      return rows.map(toMeasurement);
    },

    getStats() {
      const allWorkouts = db.select().from(workouts).all().map(toWorkout);
      return calculateStats(allWorkouts);
    },

    setGoal(data) {
      const id = data.id ?? generateId();
      const createdAt = new Date().toISOString();

      db.insert(fitnessGoals).values({
        id,
        type: data.type,
        target: Math.round(data.target),
        current: 0,
        unit: data.unit,
        deadline: data.deadline ?? null,
        createdAt,
      }).run();

      const goal: FitnessGoal = {
        id,
        type: data.type,
        target: data.target,
        current: 0,
        unit: data.unit,
        deadline: data.deadline,
        createdAt,
      };

      router.emit(FITNESS_EVENTS.GOAL.CHANGED, { goalId: id });
      return goal;
    },

    listGoals() {
      return db.select().from(fitnessGoals).all().map(toGoal);
    },

    updateGoalProgress(goalId, current) {
      const result = db.update(fitnessGoals)
        .set({ current: Math.round(current) })
        .where(eq(fitnessGoals.id, goalId))
        .run();

      if (result.changes === 0) {
        throw new Error(`Goal not found: ${goalId}`);
      }

      const [row] = db.select().from(fitnessGoals).where(eq(fitnessGoals.id, goalId)).all();
      router.emit(FITNESS_EVENTS.GOAL.CHANGED, { goalId });
      return toGoal(row);
    },

    deleteGoal(id) {
      const result = db.delete(fitnessGoals).where(eq(fitnessGoals.id, id)).run();
      if (result.changes === 0) {
        throw new Error(`Goal not found: ${id}`);
      }
      router.emit(FITNESS_EVENTS.GOAL.CHANGED, { goalId: id });
      return { success: true };
    },
  };
}
