import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  hostDeviceId: text('host_device_id'),
  settings: text('settings').notNull().default('{"autoStart":false,"maxConcurrent":3,"defaultBranch":"main"}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
