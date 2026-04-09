import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  type: text('type').notNull(),
  duration: integer('duration'),
  exercises: text('exercises', { mode: 'json' }).$type<unknown[]>().notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_workouts_date').on(table.date),
]);

export const bodyMeasurements = sqliteTable('body_measurements', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  weight: integer('weight'),
  bodyFat: integer('body_fat'),
  muscleMass: integer('muscle_mass'),
  boneMass: integer('bone_mass'),
  waterPercentage: integer('water_percentage'),
  visceralFat: integer('visceral_fat'),
  source: text('source'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_measurements_date').on(table.date),
]);

export const fitnessGoals = sqliteTable('fitness_goals', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  target: integer('target').notNull(),
  current: integer('current').notNull().default(0),
  unit: text('unit').notNull(),
  deadline: text('deadline'),
  createdAt: text('created_at').notNull(),
});
