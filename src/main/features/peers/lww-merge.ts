import { compareHlc } from '@shared/replication/hlc';
import { TOMBSTONE_COLUMN, type Op } from '@shared/replication/op-types';

export type RowMetaState = Record<string, { hlc: string; originPeerId: string } | undefined>;

export interface RowMetaUpdate {
  columnName: string;
  hlc: string;
  originPeerId: string;
}

export interface MergeResult {
  /** Column → new value. Apply these as a SQL UPDATE (or INSERT for op_type=insert). */
  columnsToApply: Record<string, unknown>;
  /** Rows to upsert into `row_meta`. */
  rowMetaUpdates: RowMetaUpdate[];
  /** True if the op is a delete that wins over current state. Caller should physically delete the row. */
  tombstone: boolean;
  /** True if update wins over an existing tombstone — caller must clear the tombstone row_meta. */
  resurrectTombstone: boolean;
}

function incomingWins(meta: RowMetaState, column: string, incomingHlc: string): boolean {
  const local = meta[column];
  if (!local) return true;
  return compareHlc(incomingHlc, local.hlc) > 0;
}

export function mergeOp(meta: RowMetaState, op: Op): MergeResult {
  const result: MergeResult = {
    columnsToApply: {},
    rowMetaUpdates: [],
    tombstone: false,
    resurrectTombstone: false,
  };

  const tombstoneMeta = meta[TOMBSTONE_COLUMN];

  if (op.opType === 'delete') {
    if (incomingWins(meta, TOMBSTONE_COLUMN, op.hlc)) {
      result.tombstone = true;
      result.rowMetaUpdates.push({
        columnName: TOMBSTONE_COLUMN,
        hlc: op.hlc,
        originPeerId: op.originPeerId,
      });
    }
    return result;
  }

  // insert or update: check tombstone first
  if (tombstoneMeta) {
    if (compareHlc(op.hlc, tombstoneMeta.hlc) <= 0) {
      // Tombstone still wins — discard this op entirely.
      return result;
    }
    // Resurrection: op hlc beats tombstone hlc.
    result.resurrectTombstone = true;
  }

  for (const [column, cv] of Object.entries(op.payload)) {
    if (incomingWins(meta, column, cv.hlc)) {
      result.columnsToApply[column] = cv.value;
      result.rowMetaUpdates.push({
        columnName: column,
        hlc: cv.hlc,
        originPeerId: op.originPeerId,
      });
    }
  }

  return result;
}
