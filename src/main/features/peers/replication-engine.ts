import { and, eq, sql } from 'drizzle-orm';

import { nextHlc, parseHlc, receiveHlc } from '@shared/replication/hlc';
import { TOMBSTONE_COLUMN, type Op } from '@shared/replication/op-types';
import {
  isSyncTable,
  SYNC_TABLE_DEFS,
  SYNC_TABLE_PK,
  type SyncTable,
} from '@shared/replication/sync-tables';

import type { AdcDatabase } from '@main/db';
import { mergeOp, type RowMetaState } from '@main/features/peers/lww-merge';
import { createOpLogService, type OpLogService } from '@main/features/peers/op-log';
import { createPeerStore, type PeerStore } from '@main/features/peers/peer-store';
import { rowMeta as rowMetaTable } from '@main/features/peers/schema';
import { serviceLogger } from '@main/lib/logger';


const COLUMN_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface ReplicationEngineDeps {
  db: AdcDatabase;
  peerIdShort: string;
  peerIdFull: string;
  clock?: () => number;
  /** Optional override; when omitted the engine creates one internally. */
  peerStore?: PeerStore;
}

interface OpLogMaxRow { m: string | null }

/**
 * Read `MAX(hlc)` from `op_log` and return the parsed parts, or `null` if
 * the table is empty. Exported for unit testing without a real DB.
 * Audit reference: tmp/audit/03-replication.md C6.
 */
export function seedLastHlcFromDb(
  client: { prepare: (sql: string) => { get: () => unknown } },
): string | null {
  const row = client.prepare('SELECT MAX(hlc) AS m FROM op_log').get() as OpLogMaxRow | undefined;
  if (row?.m === null || row?.m === undefined) return null;
  // Validate parseability — a malformed row would explode `nextHlc` later.
  parseHlc(row.m);
  return row.m;
}

/**
 * Write a set of columns into a sync table via raw SQL. Validates each column
 * name against `COLUMN_NAME_RE` (identifier syntax) and against
 * `SYNC_TABLE_DEFS[tableName].columns` (closed allowlist). Throws if either
 * check fails.
 *
 * Exported for unit testing without a real DB. Audit reference:
 * tmp/audit/03-replication.md H8.
 */
export function applyColumnsToUserTableWith(
  client: SqliteClient,
  tableName: SyncTable,
  pk: string,
  columns: Record<string, unknown>,
  opType: 'insert' | 'update',
): void {
  if (Object.keys(columns).length === 0) return;
  const allowed = SYNC_TABLE_DEFS[tableName].columns;
  for (const col of Object.keys(columns)) {
    if (!COLUMN_NAME_RE.test(col)) {
      throw new Error(`invalid column name in remote op: ${col}`);
    }
    if (!allowed.has(col)) {
      throw new Error(`peers: column ${col} not in allowlist for ${tableName}`);
    }
  }
  const cols = Object.keys(columns);
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map((c) => columns[c]);
  const pkCol = SYNC_TABLE_PK[tableName];

  if (opType === 'insert') {
    client
      .prepare(
        `INSERT INTO ${tableName} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})
         ON CONFLICT("${pkCol}") DO UPDATE SET ${cols.map((c) => `"${c}"=excluded."${c}"`).join(', ')}`,
      )
      .run(...values);
  } else {
    client
      .prepare(`UPDATE ${tableName} SET ${cols.map((c) => `"${c}"=?`).join(', ')} WHERE "${pkCol}"=?`)
      .run(...values, pk);
  }
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
  getLocalPeerId: () => string;
  onLocalOp: (listener: (op: Op) => void) => () => void;
  gcOpLog: (watermarkHlc: string) => { deleted: number };
}

interface SqliteRunResult {
  changes?: number;
}

interface SqliteClient {
  prepare: (q: string) => {
    run: (...a: unknown[]) => SqliteRunResult | undefined;
    get: (...a: unknown[]) => unknown;
  };
}

/** Helper bundle that `applyDedupedOpInTx` calls into. Closures capture the
 *  drizzle `db` so the helper itself stays free of ORM types and can be
 *  exercised by pure unit tests with stubs. */
export interface ApplyDedupedOpHelpers {
  loadRowMeta: (tableName: string, pk: string) => RowMetaState;
  mergeOp: typeof mergeOp;
  applyColumnsToUserTable: (
    tableName: SyncTable,
    pk: string,
    columns: Record<string, unknown>,
    opType: 'insert' | 'update',
  ) => void;
  deleteFromUserTable: (tableName: SyncTable, pk: string) => void;
  upsertRowMeta: (
    tableName: string,
    pk: string,
    updates: Array<{ columnName: string; hlc: string; originPeerId: string }>,
  ) => void;
  /** Delete *all* row_meta rows for (tableName, pk). Used after a winning tombstone. */
  deleteRowMetaForPk: (tableName: string, pk: string) => void;
  /** Delete only the `__deleted__` row_meta row for (tableName, pk). Used on resurrection. */
  clearTombstoneRowMeta: (tableName: string, pk: string) => void;
}

export interface ApplyDedupedOpDeps {
  client: SqliteClient;
  peerStore: Pick<PeerStore, 'recordObserved'>;
  helpers: ApplyDedupedOpHelpers;
}

/**
 * Apply a single remote op inside an already-open transaction.
 *
 * Step 1: insert the op into `op_log` first with `ON CONFLICT DO NOTHING`. If
 *   `changes === 0` the op was already delivered — return early without
 *   touching `row_meta`, the user table, or the per-peer frontier.
 * Step 2: run the LWW merge, mutate the user table + `row_meta`.
 * Step 3: persist the per-peer frontier so the GC watermark has accurate
 *   `last_seen_hlc`.
 *
 * Audit reference: tmp/audit/03-replication.md C3 (dedup must run first to
 * avoid wasted merge work on duplicate delivery).
 */
export function applyDedupedOpInTx(deps: ApplyDedupedOpDeps, op: Op): boolean {
  const { client, peerStore, helpers } = deps;

  const insertResult = client
    .prepare(
      'INSERT INTO op_log (hlc, origin_peer_id, table_name, pk, op_type, payload, applied_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(origin_peer_id, hlc) DO NOTHING',
    )
    .run(
      op.hlc,
      op.originPeerId,
      op.tableName,
      op.pk,
      op.opType,
      JSON.stringify(op.payload),
      Date.now(),
    );

  const changes = insertResult?.changes ?? 0;
  if (changes === 0) {
    // Duplicate delivery — skip all merge work.
    return false;
  }

  const meta = helpers.loadRowMeta(op.tableName, op.pk);
  const result = helpers.mergeOp(meta, op);

  if (result.tombstone) {
    helpers.deleteFromUserTable(op.tableName, op.pk);
    helpers.deleteRowMetaForPk(op.tableName, op.pk);
  }

  if (result.resurrectTombstone) {
    helpers.clearTombstoneRowMeta(op.tableName, op.pk);
  }

  if (Object.keys(result.columnsToApply).length > 0) {
    helpers.applyColumnsToUserTable(
      op.tableName,
      op.pk,
      result.columnsToApply,
      op.opType === 'insert' ? 'insert' : 'update',
    );
  }

  helpers.upsertRowMeta(op.tableName, op.pk, result.rowMetaUpdates);

  // Persist the per-peer frontier so the GC watermark has accurate
  // `last_seen_hlc`. Audit reference: tmp/audit/03-replication.md C5.
  peerStore.recordObserved(op.originPeerId, op.hlc);

  return true;
}

function $client(db: AdcDatabase): SqliteClient {
  return (db as unknown as { $client: SqliteClient }).$client;
}

export function createReplicationEngine(deps: ReplicationEngineDeps): ReplicationEngine {
  const { db, peerIdShort, peerIdFull } = deps;
  const clock = deps.clock ?? (() => Date.now());
  const opLog: OpLogService = createOpLogService(db);
  const peerStore: PeerStore = deps.peerStore ?? createPeerStore(db);

  // Seed lastHlc from op_log so HLC monotonicity survives process restart.
  // Audit reference: tmp/audit/03-replication.md C6.
  let lastHlc: string | null = (() => {
    try {
      return seedLastHlcFromDb($client(db));
    } catch (err) {
      serviceLogger.warn({ err }, 'peers.replication.seedLastHlc threw — starting from null');
      return null;
    }
  })();
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
    applyColumnsToUserTableWith($client(db), tableName, pk, columns, opType);
  }

  // tableName is a branded SyncTable (guarded by isSyncTable), so interpolating it
  // and the PK column from SYNC_TABLE_PK is safe — both come from a closed allowlist.
  function deleteFromUserTable(tableName: SyncTable, pk: string): void {
    const pkCol = SYNC_TABLE_PK[tableName];
    $client(db).prepare(`DELETE FROM ${tableName} WHERE "${pkCol}"=?`).run(pk);
  }

  return {
    recordLocalWrite(args) {
      if (!isSyncTable(args.tableName)) {
        throw new Error(`recordLocalWrite called on non-sync table: ${String(args.tableName)}`);
      }

      const hlc = nextHlc({ lastHlc, wallClockMs: clock(), peerIdShort });

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
        lastHlc = hlc; // advance only on successful commit
      });

      for (const l of localOpListeners) {
        try {
          l(op);
        } catch (err) {
          serviceLogger.error({ err }, 'peers.replication.localOpListener threw');
        }
      }

      return op;
    },

    applyRemoteOp(op) {
      if (!isSyncTable(op.tableName)) return;

      lastHlc = receiveHlc(lastHlc, op.hlc);

      db.transaction(() => {
        applyDedupedOpInTx(
          {
            client: $client(db),
            peerStore,
            helpers: {
              loadRowMeta,
              mergeOp,
              applyColumnsToUserTable,
              deleteFromUserTable,
              upsertRowMeta,
              deleteRowMetaForPk: (tableName, pk) => {
                db.delete(rowMetaTable)
                  .where(and(eq(rowMetaTable.tableName, tableName), eq(rowMetaTable.pk, pk)))
                  .run();
              },
              clearTombstoneRowMeta: (tableName, pk) => {
                db.delete(rowMetaTable)
                  .where(
                    and(
                      eq(rowMetaTable.tableName, tableName),
                      eq(rowMetaTable.pk, pk),
                      eq(rowMetaTable.columnName, TOMBSTONE_COLUMN),
                    ),
                  )
                  .run();
              },
            },
          },
          op,
        );
      });
    },

    getLastHlc() {
      return lastHlc;
    },

    getLocalPeerId() {
      return peerIdFull;
    },

    onLocalOp(listener) {
      localOpListeners.add(listener);
      return () => localOpListeners.delete(listener);
    },

    gcOpLog(watermarkHlc) {
      return opLog.gc(watermarkHlc);
    },
  };
}
