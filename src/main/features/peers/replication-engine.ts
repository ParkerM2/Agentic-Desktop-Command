import { and, eq, sql } from 'drizzle-orm';

import type { AdcDatabase } from '@main/db';
import { createOpLogService, type OpLogService } from '@main/features/peers/op-log';
import { mergeOp, type RowMetaState } from '@main/features/peers/lww-merge';
import { rowMeta as rowMetaTable } from '@main/features/peers/schema';

import { nextHlc, receiveHlc } from '@shared/replication/hlc';
import { isSyncTable, type SyncTable } from '@shared/replication/sync-tables';
import { TOMBSTONE_COLUMN, type Op } from '@shared/replication/op-types';

export interface ReplicationEngineDeps {
  db: AdcDatabase;
  peerIdShort: string;
  peerIdFull: string;
  clock?: () => number;
}

export interface RecordLocalWriteArgs {
  tableName: SyncTable;
  pk: string;
  opType: 'insert' | 'update' | 'delete';
  columns: Record<string, unknown>;
}

export interface ReplicationEngine {
  recordLocalWrite: (args: RecordLocalWriteArgs) => Op;
  applyRemoteOp: (op: Op) => void;
  getLastHlc: () => string | null;
  onLocalOp: (listener: (op: Op) => void) => () => void;
}

type SqliteClient = { prepare: (q: string) => { run: (...a: unknown[]) => void } };

function $client(db: AdcDatabase): SqliteClient {
  return (db as unknown as { $client: SqliteClient }).$client;
}

export function createReplicationEngine(deps: ReplicationEngineDeps): ReplicationEngine {
  const { db, peerIdShort, peerIdFull } = deps;
  const clock = deps.clock ?? (() => Date.now());
  const opLog: OpLogService = createOpLogService(db);

  let lastHlc: string | null = null;
  const localOpListeners = new Set<(op: Op) => void>();

  function loadRowMeta(tableName: string, pk: string): RowMetaState {
    const rows = db
      .select()
      .from(rowMetaTable)
      .where(and(eq(rowMetaTable.tableName, tableName), eq(rowMetaTable.pk, pk)))
      .all();
    const state: RowMetaState = {};
    for (const r of rows) {
      state[r.columnName] = { hlc: r.hlc, originPeerId: r.originPeerId };
    }
    return state;
  }

  function upsertRowMeta(
    tableName: string,
    pk: string,
    updates: Array<{ columnName: string; hlc: string; originPeerId: string }>,
  ): void {
    for (const u of updates) {
      db.insert(rowMetaTable)
        .values({
          tableName,
          pk,
          columnName: u.columnName,
          hlc: u.hlc,
          originPeerId: u.originPeerId,
        })
        .onConflictDoUpdate({
          target: [rowMetaTable.tableName, rowMetaTable.pk, rowMetaTable.columnName],
          set: { hlc: u.hlc, originPeerId: u.originPeerId },
          where: sql`${rowMetaTable.hlc} < ${u.hlc}`,
        })
        .run();
    }
  }

  function applyColumnsToUserTable(
    tableName: SyncTable,
    pk: string,
    columns: Record<string, unknown>,
    opType: 'insert' | 'update',
  ): void {
    if (Object.keys(columns).length === 0) return;
    const session = $client(db);
    const cols = Object.keys(columns);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => columns[c]);

    if (opType === 'insert') {
      session
        .prepare(
          `INSERT INTO ${tableName} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})
           ON CONFLICT(slug) DO UPDATE SET ${cols.map((c) => `"${c}"=excluded."${c}"`).join(', ')}`,
        )
        .run(...values);
    } else {
      session
        .prepare(`UPDATE ${tableName} SET ${cols.map((c) => `"${c}"=?`).join(', ')} WHERE slug=?`)
        .run(...values, pk);
    }
  }

  function deleteFromUserTable(tableName: SyncTable, pk: string): void {
    $client(db).prepare(`DELETE FROM ${tableName} WHERE slug=?`).run(pk);
  }

  return {
    recordLocalWrite(args) {
      if (!isSyncTable(args.tableName)) {
        throw new Error(`recordLocalWrite called on non-sync table: ${args.tableName}`);
      }

      const hlc = nextHlc({ lastHlc, wallClockMs: clock(), peerIdShort });
      lastHlc = hlc;

      const payload: Op['payload'] = {};
      if (args.opType !== 'delete') {
        for (const [col, value] of Object.entries(args.columns)) {
          payload[col] = { value, hlc };
        }
      }

      const op: Op = {
        hlc,
        originPeerId: peerIdFull,
        tableName: args.tableName,
        pk: args.pk,
        opType: args.opType,
        payload,
      };

      db.transaction(() => {
        opLog.append(op);
        if (args.opType === 'delete') {
          db.delete(rowMetaTable)
            .where(and(eq(rowMetaTable.tableName, args.tableName), eq(rowMetaTable.pk, args.pk)))
            .run();
          upsertRowMeta(args.tableName, args.pk, [
            { columnName: TOMBSTONE_COLUMN, hlc, originPeerId: peerIdFull },
          ]);
        } else {
          upsertRowMeta(
            args.tableName,
            args.pk,
            Object.keys(args.columns).map((columnName) => ({
              columnName,
              hlc,
              originPeerId: peerIdFull,
            })),
          );
        }
      });

      for (const l of localOpListeners) {
        try {
          l(op);
        } catch (err) {
          console.error('localOpListener threw', err);
        }
      }

      return op;
    },

    applyRemoteOp(op) {
      if (!isSyncTable(op.tableName)) return;

      lastHlc = receiveHlc(lastHlc, op.hlc);

      db.transaction(() => {
        const meta = loadRowMeta(op.tableName, op.pk);
        const result = mergeOp(meta, op);

        if (result.tombstone) {
          deleteFromUserTable(op.tableName, op.pk);
          db.delete(rowMetaTable)
            .where(and(eq(rowMetaTable.tableName, op.tableName), eq(rowMetaTable.pk, op.pk)))
            .run();
        }

        if (result.resurrectTombstone) {
          db.delete(rowMetaTable)
            .where(
              and(
                eq(rowMetaTable.tableName, op.tableName),
                eq(rowMetaTable.pk, op.pk),
                eq(rowMetaTable.columnName, TOMBSTONE_COLUMN),
              ),
            )
            .run();
        }

        if (Object.keys(result.columnsToApply).length > 0) {
          applyColumnsToUserTable(
            op.tableName,
            op.pk,
            result.columnsToApply,
            op.opType === 'insert' ? 'insert' : 'update',
          );
        }

        upsertRowMeta(op.tableName, op.pk, result.rowMetaUpdates);
        opLog.append(op);
      });
    },

    getLastHlc() {
      return lastHlc;
    },

    onLocalOp(listener) {
      localOpListeners.add(listener);
      return () => localOpListeners.delete(listener);
    },
  };
}
