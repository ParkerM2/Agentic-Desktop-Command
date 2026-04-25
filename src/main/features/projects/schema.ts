import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id'),
  name: text('name').notNull(),
  description: text('description'),
  rootPath: text('root_path').notNull(),
  gitUrl: text('git_url'),
  repoStructure: text('repo_structure').notNull().default('single'),
  defaultBranch: text('default_branch').notNull().default('main'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('idx_projects_workspace').on(t.workspaceId),
]);

export const subProjects = sqliteTable('sub_projects', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  relativePath: text('relative_path').notNull(),
  gitUrl: text('git_url'),
  defaultBranch: text('default_branch').notNull().default('main'),
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('idx_sub_projects_project').on(t.projectId),
]);

export type ProjectRow = typeof projects.$inferSelect;
export type SubProjectRow = typeof subProjects.$inferSelect;
