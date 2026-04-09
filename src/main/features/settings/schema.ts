import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ── Settings ────────────────────────────────────────────────

export const settingsKv = sqliteTable('settings_kv', {
  key: text('key').primaryKey(), // singleton 'default'
  settings: text('settings', { mode: 'json' }).$type<unknown>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  apiKey: text('api_key'), // encrypted
  model: text('model'),
  configDir: text('config_dir'),
  oauthToken: text('oauth_token'), // encrypted
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
