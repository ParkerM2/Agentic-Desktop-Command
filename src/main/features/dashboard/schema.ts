import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const captures = sqliteTable('captures', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});
