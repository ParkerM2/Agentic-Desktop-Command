import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const dailyPlans = sqliteTable('daily_plans', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  goals: text('goals', { mode: 'json' }).$type<string[]>().notNull(),
  scheduledTasks: text('scheduled_tasks', { mode: 'json' }).$type<string[]>().notNull(),
  timeBlocks: text('time_blocks', { mode: 'json' }).$type<Array<{ id: string; startTime: string; endTime: string; type: string; label?: string }>>().notNull(),
  reflection: text('reflection'),
  updatedAt: text('updated_at').notNull(),
});

export const weeklyReviews = sqliteTable('weekly_reviews', {
  weekStartDate: text('week_start_date').primaryKey(), // Monday YYYY-MM-DD
  weekEndDate: text('week_end_date').notNull(),
  days: text('days', { mode: 'json' }).$type<unknown[]>().notNull(),
  summary: text('summary'),
  reflection: text('reflection'),
  updatedAt: text('updated_at').notNull(),
});
