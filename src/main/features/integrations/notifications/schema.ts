import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  title: text('title'),
  message: text('message'),
  url: text('url'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  timestamp: text('timestamp').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
}, (table) => [
  index('idx_notifications_source').on(table.source),
  index('idx_notifications_timestamp').on(table.timestamp),
]);

// notification_config has been consolidated into settings_kv (category='notification').
