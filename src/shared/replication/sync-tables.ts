export const SYNC_TABLES = ['progress_tasks'] as const;

export type SyncTable = typeof SYNC_TABLES[number];

export function isSyncTable(name: string): name is SyncTable {
  return (SYNC_TABLES as readonly string[]).includes(name);
}
