import { describe, expect, it, vi } from 'vitest';

import type { Op } from '@shared/replication/op-types';

import {
  applyDedupedOpInTx,
  type ApplyDedupedOpDeps,
  type ApplyDedupedOpHelpers,
} from '@main/features/peers/replication-engine';

/**
 * Audit reference: tmp/audit/03-replication.md C3.
 *
 * Pure unit tests for the dedup-first transaction body. We stub the SQL client
 * and helper bundle so the test never touches better-sqlite3.
 *
 * On duplicate delivery (`changes === 0` from the op_log INSERT), the merge
 * helpers must NOT be called. On a fresh op (`changes === 1`), they must run.
 */

function makeOp(overrides: Partial<Op> = {}): Op {
  return {
    hlc: '0000000099999.00000001.aaaaaaaa',
    originPeerId: 'peer-a-full-id',
    tableName: 'notes',
    pk: 'note-1',
    opType: 'update',
    payload: { title: { value: 'x', hlc: '0000000099999.00000001.aaaaaaaa' } },
    ...overrides,
  };
}

function makeHelpers(): ApplyDedupedOpHelpers {
  return {
    loadRowMeta: vi.fn(() => ({})),
    mergeOp: vi.fn(() => ({
      columnsToApply: { title: 'x' },
      rowMetaUpdates: [
        {
          columnName: 'title',
          hlc: '0000000099999.00000001.aaaaaaaa',
          originPeerId: 'peer-a-full-id',
        },
      ],
      tombstone: false,
      resurrectTombstone: false,
    })),
    applyColumnsToUserTable: vi.fn(),
    deleteFromUserTable: vi.fn(),
    upsertRowMeta: vi.fn(),
    deleteRowMetaForPk: vi.fn(),
    clearTombstoneRowMeta: vi.fn(),
  };
}

function makeDeps(insertChanges: number) {
  const runMock = vi.fn(() => ({ changes: insertChanges }));
  const helpers = makeHelpers();
  const recordObserved = vi.fn();
  const deps: ApplyDedupedOpDeps = {
    client: {
      prepare: vi.fn(() => ({
        run: runMock,
        get: vi.fn(),
      })),
    },
    peerStore: { recordObserved },
    helpers,
  };
  return { deps, helpers, recordObserved, runMock };
}

describe('applyDedupedOpInTx — dedup short-circuit', () => {
  it('runs the op_log INSERT first', () => {
    const { deps, runMock } = makeDeps(1);
    const prepareSpy = deps.client.prepare as ReturnType<typeof vi.fn>;
    applyDedupedOpInTx(deps, makeOp());
    expect(prepareSpy).toHaveBeenCalled();
    const sql = prepareSpy.mock.calls[0][0] as string;
    expect(sql).toMatch(/INSERT INTO op_log/);
    expect(sql).toMatch(/ON CONFLICT\(origin_peer_id, hlc\) DO NOTHING/);
    expect(runMock).toHaveBeenCalledTimes(1);
  });

  it('returns false and skips merge when dedup INSERT reports changes === 0', () => {
    const { deps, helpers, recordObserved } = makeDeps(0);
    const result = applyDedupedOpInTx(deps, makeOp());
    expect(result).toBe(false);
    expect(helpers.loadRowMeta).not.toHaveBeenCalled();
    expect(helpers.mergeOp).not.toHaveBeenCalled();
    expect(helpers.applyColumnsToUserTable).not.toHaveBeenCalled();
    expect(helpers.upsertRowMeta).not.toHaveBeenCalled();
    expect(helpers.deleteFromUserTable).not.toHaveBeenCalled();
    expect(helpers.deleteRowMetaForPk).not.toHaveBeenCalled();
    expect(helpers.clearTombstoneRowMeta).not.toHaveBeenCalled();
    expect(recordObserved).not.toHaveBeenCalled();
  });

  it('returns true and runs the full merge pipeline when dedup INSERT inserts a row', () => {
    const { deps, helpers, recordObserved } = makeDeps(1);
    const op = makeOp();
    const result = applyDedupedOpInTx(deps, op);

    expect(result).toBe(true);
    expect(helpers.loadRowMeta).toHaveBeenCalledWith('notes', 'note-1');
    expect(helpers.mergeOp).toHaveBeenCalledTimes(1);
    expect(helpers.applyColumnsToUserTable).toHaveBeenCalledWith(
      'notes',
      'note-1',
      { title: 'x' },
      'update',
    );
    expect(helpers.upsertRowMeta).toHaveBeenCalledTimes(1);
    expect(recordObserved).toHaveBeenCalledWith(op.originPeerId, op.hlc);
  });

  it('on tombstone: deletes from user table and clears all row_meta for pk', () => {
    const { deps, helpers } = makeDeps(1);
    helpers.mergeOp = vi.fn(() => ({
      columnsToApply: {},
      rowMetaUpdates: [
        {
          columnName: '__deleted__',
          hlc: '0000000099999.00000001.aaaaaaaa',
          originPeerId: 'peer-a-full-id',
        },
      ],
      tombstone: true,
      resurrectTombstone: false,
    }));
    deps.helpers = helpers;

    applyDedupedOpInTx(deps, makeOp({ opType: 'delete', payload: {} }));
    expect(helpers.deleteFromUserTable).toHaveBeenCalledWith('notes', 'note-1');
    expect(helpers.deleteRowMetaForPk).toHaveBeenCalledWith('notes', 'note-1');
    expect(helpers.applyColumnsToUserTable).not.toHaveBeenCalled();
  });

  it('on resurrection: clears only the tombstone row_meta entry', () => {
    const { deps, helpers } = makeDeps(1);
    helpers.mergeOp = vi.fn(() => ({
      columnsToApply: { title: 'x' },
      rowMetaUpdates: [
        {
          columnName: 'title',
          hlc: '0000000099999.00000001.aaaaaaaa',
          originPeerId: 'peer-a-full-id',
        },
      ],
      tombstone: false,
      resurrectTombstone: true,
    }));
    deps.helpers = helpers;

    applyDedupedOpInTx(deps, makeOp());
    expect(helpers.clearTombstoneRowMeta).toHaveBeenCalledWith('notes', 'note-1');
    expect(helpers.deleteRowMetaForPk).not.toHaveBeenCalled();
    expect(helpers.applyColumnsToUserTable).toHaveBeenCalled();
  });

  it('treats an undefined run() return (changes missing) as duplicate and skips merge', () => {
    const helpers = makeHelpers();
    const recordObserved = vi.fn();
    const deps: ApplyDedupedOpDeps = {
      client: {
        prepare: vi.fn(() => ({
          run: vi.fn((): undefined => undefined),
          get: vi.fn(),
        })),
      },
      peerStore: { recordObserved },
      helpers,
    };
    const result = applyDedupedOpInTx(deps, makeOp());
    expect(result).toBe(false);
    expect(helpers.mergeOp).not.toHaveBeenCalled();
    expect(recordObserved).not.toHaveBeenCalled();
  });
});
