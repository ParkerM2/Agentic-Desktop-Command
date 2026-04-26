import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const opLog = sqliteTable(
  'op_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    hlc: text('hlc').notNull(),
    originPeerId: text('origin_peer_id').notNull(),
    tableName: text('table_name').notNull(),
    pk: text('pk').notNull(),
    opType: text('op_type', { enum: ['insert', 'update', 'delete'] }).notNull(),
    payload: text('payload').notNull(),
    appliedAt: integer('applied_at').notNull(),
  },
  (t) => [
    uniqueIndex('op_log_dedup').on(t.originPeerId, t.hlc),
    // Speeds up GC scans (`DELETE FROM op_log WHERE hlc < ?`).
    // Audit reference: tmp/audit/03-replication.md H2.
    index('op_log_by_hlc').on(t.hlc),
  ],
);

export const rowMeta = sqliteTable(
  'row_meta',
  {
    tableName: text('table_name').notNull(),
    pk: text('pk').notNull(),
    columnName: text('column_name').notNull(),
    hlc: text('hlc').notNull(),
    originPeerId: text('origin_peer_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tableName, t.pk, t.columnName] }),
    index('row_meta_by_row').on(t.tableName, t.pk),
  ],
);

export type OpLogRow = typeof opLog.$inferSelect;
export type RowMetaRow = typeof rowMeta.$inferSelect;
