import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sessionLogs = sqliteTable('session_logs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  slug: text('slug').notNull(),
  eventType: text('event_type').notNull(),
  payload: text('payload', { mode: 'json' }).$type<unknown>(),
  timestamp: text('timestamp').notNull(),
}, (table) => [
  index('idx_session_logs_session_id').on(table.sessionId),
  index('idx_session_logs_slug').on(table.slug),
]);
