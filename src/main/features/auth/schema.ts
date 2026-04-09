import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const oauthTokens = sqliteTable('oauth_tokens', {
  provider: text('provider').primaryKey(),
  encrypted: text('encrypted').notNull(),
  useSafeStorage: integer('use_safe_storage', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at').notNull(),
});
