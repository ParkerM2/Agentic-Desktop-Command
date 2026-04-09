import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const hubConfig = sqliteTable('hub_config', {
  key: text('key').primaryKey(), // singleton 'default'
  hubUrl: text('hub_url').notNull(),
  encryptedApiKey: text('encrypted_api_key').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastConnected: text('last_connected'),
  updatedAt: text('updated_at').notNull(),
});
