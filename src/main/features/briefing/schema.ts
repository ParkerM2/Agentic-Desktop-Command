import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const briefings = sqliteTable('briefings', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  content: text('content', { mode: 'json' }).$type<unknown>().notNull(),
  generatedAt: text('generated_at').notNull(),
});

export const briefingConfig = sqliteTable('briefing_config', {
  key: text('key').primaryKey(), // singleton row with key='default'
  config: text('config', { mode: 'json' }).$type<unknown>().notNull(),
  updatedAt: text('updated_at').notNull(),
});
