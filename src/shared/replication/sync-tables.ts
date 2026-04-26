/**
 * Definitions for every table that participates in cross-peer replication.
 *
 * Each entry pins:
 *   - `pk`: the primary-key column name used by `applyColumnsToUserTable` and
 *     `deleteFromUserTable` to assemble `ON CONFLICT(pk)` / `WHERE pk = ?`
 *     clauses. Must match the drizzle schema.
 *   - `columns`: the closed set of column names that may appear in an incoming
 *     `Op.payload`. The replication engine validates every remote column key
 *     against this set; an unknown column throws and aborts the transaction.
 *
 * Audit reference: tmp/audit/03-replication.md H8, H9.
 */
export const SYNC_TABLE_DEFS = {
  progress_tasks: {
    pk: 'slug',
    columns: new Set([
      'slug',
      'id',
      'project_id',
      'title',
      'status',
      'priority',
      'jira_key',
      'jira_url',
      'pr_url',
      'pr_number',
      'pr_status',
      'last_session_id',
      'last_agent_name',
      'completed_at',
      'archived_at',
      'team_name',
      'workflow',
      'workflow_phase',
      'session_history',
      'description',
      'created_at',
      'updated_at',
    ]),
  },
  workflow_runs_summary: {
    pk: 'id',
    columns: new Set([
      'id',
      'project_id',
      'task_id',
      'workflow_id',
      'status',
      'started_at',
      'finished_at',
      'summary',
      'ran_on_peer_id',
    ]),
  },
  notes: {
    pk: 'id',
    columns: new Set([
      'id',
      'title',
      'content',
      'tags',
      'project_id',
      'task_id',
      'pinned',
      'created_at',
      'updated_at',
    ]),
  },
  ideas: {
    pk: 'id',
    columns: new Set([
      'id',
      'title',
      'description',
      'status',
      'category',
      'tags',
      'project_id',
      'votes',
      'created_at',
      'updated_at',
    ]),
  },
} as const satisfies Record<string, { pk: string; columns: ReadonlySet<string> }>;

export type SyncTable = keyof typeof SYNC_TABLE_DEFS;

export const SYNC_TABLES: readonly SyncTable[] = Object.keys(SYNC_TABLE_DEFS) as SyncTable[];

export type SyncTablePkMap = Readonly<Record<SyncTable, string>>;

export const SYNC_TABLE_PK: SyncTablePkMap = Object.fromEntries(
  Object.entries(SYNC_TABLE_DEFS).map(([k, v]) => [k, v.pk]),
) as SyncTablePkMap;

export function isSyncTable(name: string): name is SyncTable {
  return Object.prototype.hasOwnProperty.call(SYNC_TABLE_DEFS, name);
}
