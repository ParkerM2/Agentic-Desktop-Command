import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const changelogEntries = sqliteTable('changelog_entries', {
  version: text('version').primaryKey(),
  date: text('date').notNull(),
  categories: text('categories', { mode: 'json' }).$type<Array<{ type: string; items: string[] }>>().notNull(),
  createdAt: text('created_at').notNull(),
});
