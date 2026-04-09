import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'reminder' | 'deadline' | 'notification' | 'recurring'
  message: text('message').notNull(),
  triggerAt: text('trigger_at').notNull(),
  recurring: text('recurring', { mode: 'json' }).$type<{ frequency: string; time: string; daysOfWeek?: number[] } | null>(),
  linkedTo: text('linked_to', { mode: 'json' }).$type<{ type: string; id: string } | null>(),
  dismissed: integer('dismissed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});
