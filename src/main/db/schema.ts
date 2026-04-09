import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

// ── Domain Data Tables ──────────────────────────────────────

export const captures = sqliteTable('captures', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
  projectId: text('project_id'),
  taskId: text('task_id'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_notes_project_id').on(table.projectId),
  index('idx_notes_updated_at').on(table.updatedAt),
]);

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'reminder' | 'deadline' | 'notification' | 'recurring'
  message: text('message').notNull(),
  triggerAt: text('trigger_at').notNull(),
  recurring: text('recurring', { mode: 'json' }).$type<{ frequency: string; time: string; daysOfWeek?: number[] } | null>(),
  linkedTo: text('linked_to', { mode: 'json' }).$type<{ type: string; id: string } | null>(),
  dismissed: integer('dismissed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

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

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  targetDate: text('target_date').notNull(),
  status: text('status').notNull(), // 'planned' | 'in-progress' | 'completed'
  tasks: text('tasks', { mode: 'json' }).$type<Array<{ id: string; title: string; completed: boolean }>>().notNull(),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_milestones_project_id').on(table.projectId),
]);

export const dailyPlans = sqliteTable('daily_plans', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  goals: text('goals', { mode: 'json' }).$type<string[]>().notNull(),
  scheduledTasks: text('scheduled_tasks', { mode: 'json' }).$type<string[]>().notNull(),
  timeBlocks: text('time_blocks', { mode: 'json' }).$type<Array<{ id: string; startTime: string; endTime: string; type: string; label?: string }>>().notNull(),
  reflection: text('reflection'),
  updatedAt: text('updated_at').notNull(),
});

export const weeklyReviews = sqliteTable('weekly_reviews', {
  weekStartDate: text('week_start_date').primaryKey(), // Monday YYYY-MM-DD
  weekEndDate: text('week_end_date').notNull(),
  days: text('days', { mode: 'json' }).$type<unknown[]>().notNull(),
  summary: text('summary'),
  reflection: text('reflection'),
  updatedAt: text('updated_at').notNull(),
});

export const workouts = sqliteTable('workouts', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  type: text('type').notNull(),
  duration: integer('duration'),
  exercises: text('exercises', { mode: 'json' }).$type<unknown[]>().notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_workouts_date').on(table.date),
]);

export const bodyMeasurements = sqliteTable('body_measurements', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  weight: integer('weight'),
  bodyFat: integer('body_fat'),
  muscleMass: integer('muscle_mass'),
  boneMass: integer('bone_mass'),
  waterPercentage: integer('water_percentage'),
  visceralFat: integer('visceral_fat'),
  source: text('source'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_measurements_date').on(table.date),
]);

export const fitnessGoals = sqliteTable('fitness_goals', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  target: integer('target').notNull(),
  current: integer('current').notNull().default(0),
  unit: text('unit').notNull(),
  deadline: text('deadline'),
  createdAt: text('created_at').notNull(),
});

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

export const notificationConfig = sqliteTable('notification_config', {
  key: text('key').primaryKey(), // singleton row
  config: text('config', { mode: 'json' }).$type<unknown>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ── Wave 3: Complex Domains ─────────────────────────────────

export const progressTasks = sqliteTable('progress_tasks', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull(),
  priority: text('priority').notNull().default('medium'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  jiraKey: text('jira_key'),
  prUrl: text('pr_url'),
  branch: text('branch'),
  lastSessionId: text('last_session_id'),
  lastAgentName: text('last_agent_name'),
  completedAt: text('completed_at'),
  archivedAt: text('archived_at'),
  teamName: text('team_name'),
  sessionHistory: text('session_history', { mode: 'json' }).$type<unknown[]>(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_progress_tasks_status').on(table.status),
]);

export const workflowRuns = sqliteTable('workflow_runs', {
  runId: text('run_id').primaryKey(),
  featureName: text('feature_name').notNull(),
  state: text('state').notNull(),
  config: text('config', { mode: 'json' }).$type<unknown>(),
  resolvedAgents: text('resolved_agents', { mode: 'json' }).$type<unknown>(),
  error: text('error'),
  startedAt: text('started_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  completedAt: text('completed_at'),
}, (table) => [
  index('idx_workflow_runs_state').on(table.state),
]);

// ── Wave 4: Auth-Adjacent Stores ────────────────────────────

export const oauthTokens = sqliteTable('oauth_tokens', {
  provider: text('provider').primaryKey(),
  encrypted: text('encrypted').notNull(),
  useSafeStorage: integer('use_safe_storage', { mode: 'boolean' }).notNull().default(true),
  updatedAt: text('updated_at').notNull(),
});

export const emailConfig = sqliteTable('email_config', {
  key: text('key').primaryKey(), // singleton 'default'
  config: text('config', { mode: 'json' }).$type<unknown>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const emailQueue = sqliteTable('email_queue', {
  id: text('id').primaryKey(),
  email: text('email', { mode: 'json' }).$type<unknown>().notNull(),
  error: text('error'),
  retries: integer('retries').notNull().default(0),
  createdAt: text('created_at').notNull(),
  lastAttempt: text('last_attempt'),
});

export const hubConfig = sqliteTable('hub_config', {
  key: text('key').primaryKey(), // singleton 'default'
  hubUrl: text('hub_url').notNull(),
  encryptedApiKey: text('encrypted_api_key').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastConnected: text('last_connected'),
  updatedAt: text('updated_at').notNull(),
});

// ── Wave 1 continued ────────────────────────────────────────

export const changelogEntries = sqliteTable('changelog_entries', {
  version: text('version').primaryKey(),
  date: text('date').notNull(),
  categories: text('categories', { mode: 'json' }).$type<Array<{ type: string; items: string[] }>>().notNull(),
  createdAt: text('created_at').notNull(),
});

// ── Bus Infrastructure Tables ───────────────────────────────

export const commands = sqliteTable('commands', {
  id: text('id').primaryKey(),
  channel: text('channel').notNull(),
  domain: text('domain').notNull(),
  verb: text('verb').notNull(),
  noun: text('noun'),
  isMutation: integer('is_mutation', { mode: 'boolean' }).notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id'),
  sourceName: text('source_name'),
  input: text('input', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
  status: text('status').notNull(),
  error: text('error'),
  durationMs: integer('duration_ms'),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_commands_domain').on(table.domain),
  index('idx_commands_verb').on(table.verb),
  index('idx_commands_source_type').on(table.sourceType),
  index('idx_commands_project_id').on(table.projectId),
  index('idx_commands_created_at').on(table.createdAt),
]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  phase: text('phase'),
  status: text('status').notNull(),
  projectId: text('project_id'),
  taskSlug: text('task_slug'),
  model: text('model'),
  pid: integer('pid'),
  worktreePath: text('worktree_path'),
  spawnConfig: text('spawn_config', { mode: 'json' }),
  tokenUsage: text('token_usage', { mode: 'json' }),
  toolUsage: text('tool_usage', { mode: 'json' }),
  parentId: text('parent_id'),
  teamName: text('team_name'),
  wave: integer('wave'),
  taskIndex: integer('task_index'),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  exitCode: integer('exit_code'),
  error: text('error'),
}, (table) => [
  index('idx_sessions_status').on(table.status),
  index('idx_sessions_type').on(table.type),
  index('idx_sessions_project_id').on(table.projectId),
  index('idx_sessions_task_slug').on(table.taskSlug),
  index('idx_sessions_parent_id').on(table.parentId),
]);

export const busEvents = sqliteTable('bus_events', {
  id: text('id').primaryKey(),
  channel: text('channel').notNull(),
  payload: text('payload', { mode: 'json' }),
  sourceCommandId: text('source_command_id'),
  sessionId: text('session_id'),
  projectId: text('project_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_events_channel').on(table.channel),
  index('idx_events_session_id').on(table.sessionId),
  index('idx_events_source_command_id').on(table.sourceCommandId),
  index('idx_events_created_at').on(table.createdAt),
]);
