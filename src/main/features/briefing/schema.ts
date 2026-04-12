import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const briefings = sqliteTable('briefings', {
  id: text('id'),
  date: text('date').primaryKey(), // YYYY-MM-DD
  content: text('content', { mode: 'json' }).$type<unknown>().notNull(),
  generatedAt: text('generated_at').notNull(),
});

// briefing_config has been consolidated into settings_kv (category='briefing').
