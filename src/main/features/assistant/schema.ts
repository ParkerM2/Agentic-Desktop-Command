import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ── Command History ──────────────────────────────────────────

export const commandHistory = sqliteTable(
  'command_history',
  {
    id: text('id').primaryKey(),
    input: text('input').notNull(),
    responseSummary: text('response_summary').notNull(),
    timestamp: text('timestamp').notNull(),
  },
  (table) => [index('idx_command_history_timestamp').on(table.timestamp)],
);

// ── Assistant Watches ────────────────────────────────────────

export const assistantWatches = sqliteTable(
  'assistant_watches',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    targetId: text('target_id').notNull(),
    condition: text('condition', { mode: 'json' }).$type<{
      field: string;
      operator: string;
      value?: string;
    }>().notNull(),
    action: text('action').notNull(),
    followUp: text('follow_up'),
    createdAt: text('created_at').notNull(),
    triggered: integer('triggered', { mode: 'boolean' }).notNull().default(false),
    expiresAt: text('expires_at'),
  },
  (table) => [index('idx_assistant_watches_triggered').on(table.triggered)],
);
