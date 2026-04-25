import { resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Op } from '@shared/replication/op-types';

import * as schema from '@main/db/schema';
import { createOpLogService } from '@main/features/peers/op-log';

let sqlite: Database.Database;
let oplog: ReturnType<typeof createOpLogService>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  oplog = createOpLogService(db);
});

afterEach(() => sqlite.close());

function makeOp(hlc: string, pk: string): Op {
  return {
    hlc,
    originPeerId: 'peer-test',
    tableName: 'progress_tasks',
    pk,
    opType: 'insert',
    payload: { slug: { value: pk, hlc } },
  };
}

describe('op-log gc', () => {
  it('deletes rows with hlc strictly less than watermark', () => {
    oplog.append(makeOp('001', 'a'));
    oplog.append(makeOp('005', 'b'));
    oplog.append(makeOp('010', 'c'));

    const result = oplog.gc('007');
    expect(result.deleted).toBe(2);

    const remaining = oplog.readSince('peer-test', null);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].hlc).toBe('010');
  });

  it('preserves rows at or above the watermark', () => {
    oplog.append(makeOp('010', 'a'));
    oplog.append(makeOp('020', 'b'));

    const result = oplog.gc('010');
    expect(result.deleted).toBe(0); // strictly less, so '010' stays
    expect(oplog.readSince('peer-test', null)).toHaveLength(2);
  });

  it('returns deleted=0 when no rows below watermark', () => {
    oplog.append(makeOp('010', 'a'));
    const result = oplog.gc('001');
    expect(result.deleted).toBe(0);
    expect(oplog.readSince('peer-test', null)).toHaveLength(1);
  });

  it('returns deleted=0 on empty table', () => {
    const result = oplog.gc('999');
    expect(result.deleted).toBe(0);
  });
});
