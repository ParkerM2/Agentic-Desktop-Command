import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const plannerEntries = sqliteTable('planner_entries', {
  id: text('id').primaryKey(), // date for daily ('YYYY-MM-DD'), weekStartDate for weekly
  entryType: text('entry_type').notNull().$type<'daily' | 'weekly'>(),
  // daily_plans columns
  date: text('date'),
  goals: text('goals', { mode: 'json' }).$type<string[]>(),
  scheduledTasks: text('scheduled_tasks', { mode: 'json' }).$type<string[]>(),
  timeBlocks: text('time_blocks', { mode: 'json' }).$type<Array<{ id: string; startTime: string; endTime: string; type: string; label?: string }>>(),
  reflection: text('reflection'),
  // weekly_reviews columns
  weekStartDate: text('week_start_date'),
  weekEndDate: text('week_end_date'),
  days: text('days', { mode: 'json' }).$type<unknown[]>(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_planner_entries_entry_type').on(table.entryType),
  index('idx_planner_entries_date').on(table.date),
  index('idx_planner_entries_week_start_date').on(table.weekStartDate),
]);
