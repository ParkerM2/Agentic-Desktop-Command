import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const ideas = sqliteTable('ideas', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull(), // 'new' | 'exploring' | 'accepted' | 'rejected' | 'implemented'
  category: text('category').notNull(), // 'feature' | 'improvement' | 'bug' | 'performance'
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  projectId: text('project_id'),
  votes: integer('votes').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_ideas_project_id').on(table.projectId),
  index('idx_ideas_status').on(table.status),
]);
