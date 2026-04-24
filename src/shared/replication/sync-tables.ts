export const SYNC_TABLES = ['progress_tasks', 'workflow_runs_summary'] as const;

export type SyncTable = typeof SYNC_TABLES[number];

export function isSyncTable(name: string): name is SyncTable {
  return (SYNC_TABLES as readonly string[]).includes(name);
}

/** Maps each sync table to its primary-key column. Used by the replication engine
 *  to write `ON CONFLICT(pk) DO UPDATE` and `WHERE pk = ?` clauses. */
export const SYNC_TABLE_PK: Record<SyncTable, string> = {
  progress_tasks: 'slug',
  workflow_runs_summary: 'id',
};
