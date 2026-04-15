import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const emailQueue = sqliteTable('email_queue', {
  id: text('id').primaryKey(),
  email: text('email', { mode: 'json' }).$type<unknown>().notNull(),
  error: text('error'),
  retries: integer('retries').notNull().default(0),
  createdAt: text('created_at').notNull(),
  lastAttempt: text('last_attempt'),
});
