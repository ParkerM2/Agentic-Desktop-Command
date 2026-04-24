import type { SyncTable } from './sync-tables';

export type OpType = 'insert' | 'update' | 'delete';

export interface ColumnValue {
  value: unknown;
  hlc: string;
}

export interface Op {
  hlc: string;
  originPeerId: string;
  tableName: SyncTable;
  pk: string;
  opType: OpType;
  /**
   * For insert/update: every mutated column with its value and HLC.
   * For delete: empty object; the tombstone lives in `row_meta` via column `__deleted__`.
   */
  payload: Record<string, ColumnValue>;
}

export const TOMBSTONE_COLUMN = '__deleted__';
