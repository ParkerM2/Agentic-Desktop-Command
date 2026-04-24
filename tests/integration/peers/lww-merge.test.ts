import { describe, expect, it } from 'vitest';

import type { Op } from '@shared/replication/op-types';
import { TOMBSTONE_COLUMN } from '@shared/replication/op-types';

import { mergeOp, type RowMetaState } from '@main/features/peers/lww-merge';

const HLC_1 = '00000000000000000001.00000000.aaaaaaaa';
const HLC_2 = '00000000000000000002.00000000.bbbbbbbb';
const HLC_3 = '00000000000000000003.00000000.aaaaaaaa';

function op(overrides: Partial<Op> = {}): Op {
  return {
    hlc: HLC_2,
    originPeerId: 'peer-b',
    tableName: 'progress_tasks',
    pk: 'task-1',
    opType: 'update',
    payload: { title: { value: 'New', hlc: HLC_2 } },
    ...overrides,
  };
}

describe('mergeOp', () => {
  it('applies insert when no local row_meta exists', () => {
    const result = mergeOp({}, op({ opType: 'insert' }));
    expect(result.columnsToApply).toEqual({ title: 'New' });
    expect(result.rowMetaUpdates).toEqual([
      { columnName: 'title', hlc: HLC_2, originPeerId: 'peer-b' },
    ]);
    expect(result.tombstone).toBe(false);
  });

  it('skips a column when incoming hlc is older than local', () => {
    const meta: RowMetaState = { title: { hlc: HLC_3, originPeerId: 'peer-a' } };
    const result = mergeOp(meta, op({ hlc: HLC_2, payload: { title: { value: 'Old', hlc: HLC_2 } } }));
    expect(result.columnsToApply).toEqual({});
    expect(result.rowMetaUpdates).toEqual([]);
  });

  it('applies a column when incoming hlc is newer', () => {
    const meta: RowMetaState = { title: { hlc: HLC_1, originPeerId: 'peer-a' } };
    const result = mergeOp(meta, op({ hlc: HLC_2 }));
    expect(result.columnsToApply).toEqual({ title: 'New' });
    expect(result.rowMetaUpdates).toHaveLength(1);
  });

  it('merges per-column — different columns compared independently', () => {
    const meta: RowMetaState = {
      title: { hlc: HLC_3, originPeerId: 'peer-a' },
      status: { hlc: HLC_1, originPeerId: 'peer-a' },
    };
    const result = mergeOp(
      meta,
      op({
        hlc: HLC_2,
        payload: {
          title: { value: 'Loses', hlc: HLC_2 },
          status: { value: 'Wins', hlc: HLC_2 },
        },
      }),
    );
    expect(result.columnsToApply).toEqual({ status: 'Wins' });
    expect(result.rowMetaUpdates.map((u) => u.columnName)).toEqual(['status']);
  });

  it('emits tombstone for delete op', () => {
    const result = mergeOp({}, op({ opType: 'delete', payload: {}, hlc: HLC_3 }));
    expect(result.tombstone).toBe(true);
    expect(result.rowMetaUpdates).toEqual([
      { columnName: TOMBSTONE_COLUMN, hlc: HLC_3, originPeerId: 'peer-b' },
    ]);
  });

  it('does not apply update if row is tombstoned with higher hlc', () => {
    const meta: RowMetaState = {
      [TOMBSTONE_COLUMN]: { hlc: HLC_3, originPeerId: 'peer-a' },
    };
    const result = mergeOp(meta, op({ hlc: HLC_2 }));
    expect(result.columnsToApply).toEqual({});
    expect(result.tombstone).toBe(false);
    expect(result.rowMetaUpdates).toEqual([]);
  });

  it('resurrects row if update hlc is higher than tombstone hlc', () => {
    const meta: RowMetaState = {
      [TOMBSTONE_COLUMN]: { hlc: HLC_1, originPeerId: 'peer-a' },
    };
    const result = mergeOp(meta, op({ hlc: HLC_2 }));
    expect(result.columnsToApply).toEqual({ title: 'New' });
    expect(result.resurrectTombstone).toBe(true);
  });

  it('is idempotent — applying same op twice is a no-op the second time', () => {
    const meta: RowMetaState = {};
    const firstOp = op({ hlc: HLC_2, opType: 'insert' });
    const first = mergeOp(meta, firstOp);

    const metaAfter: RowMetaState = {};
    for (const u of first.rowMetaUpdates) {
      metaAfter[u.columnName] = { hlc: u.hlc, originPeerId: u.originPeerId };
    }

    const second = mergeOp(metaAfter, firstOp);
    expect(second.columnsToApply).toEqual({});
    expect(second.rowMetaUpdates).toEqual([]);
  });
});
