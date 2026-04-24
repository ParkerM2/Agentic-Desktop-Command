import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createOpLogService } from '@main/features/peers/op-log';
import type { Op } from '@shared/replication/op-types';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;
let opLog: ReturnType<typeof createOpLogService>;

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  opLog = createOpLogService(db);
});

afterEach(() => sqlite.close());

const op = (overrides: Partial<Op> = {}): Op => ({
  hlc: '00000000000000000001.00000000.aaaaaaaa',
  originPeerId: 'peer-a',
  tableName: 'progress_tasks',
  pk: 'task-1',
  opType: 'insert',
  payload: { title: { value: 'First', hlc: '00000000000000000001.00000000.aaaaaaaa' } },
  ...overrides,
});

describe('OpLogService.append', () => {
  it('persists an op', () => {
    opLog.append(op());
    const all = opLog.readSince('peer-a', null);
    expect(all).toHaveLength(1);
    expect(all[0].hlc).toBe('00000000000000000001.00000000.aaaaaaaa');
  });

  it('is idempotent on (origin_peer_id, hlc) duplicates', () => {
    opLog.append(op());
    opLog.append(op());
    const all = opLog.readSince('peer-a', null);
    expect(all).toHaveLength(1);
  });

  it('stores payload as parseable JSON', () => {
    opLog.append(op());
    const [row] = opLog.readSince('peer-a', null);
    expect(row.payload).toEqual({
      title: { value: 'First', hlc: '00000000000000000001.00000000.aaaaaaaa' },
    });
  });
});

describe('OpLogService.readSince', () => {
  it('returns ops with hlc > sinceHlc, ordered ascending', () => {
    opLog.append(op({ hlc: '00000000000000000001.00000000.aaaaaaaa' }));
    opLog.append(op({ hlc: '00000000000000000002.00000000.aaaaaaaa' }));
    opLog.append(op({ hlc: '00000000000000000003.00000000.aaaaaaaa' }));
    const result = opLog.readSince('peer-a', '00000000000000000001.00000000.aaaaaaaa');
    expect(result.map((r) => r.hlc)).toEqual([
      '00000000000000000002.00000000.aaaaaaaa',
      '00000000000000000003.00000000.aaaaaaaa',
    ]);
  });

  it('returns empty when sinceHlc is highest', () => {
    opLog.append(op({ hlc: '00000000000000000001.00000000.aaaaaaaa' }));
    const result = opLog.readSince('peer-a', '00000000000000000001.00000000.aaaaaaaa');
    expect(result).toEqual([]);
  });

  it('filters by originPeerId', () => {
    opLog.append(op({ originPeerId: 'peer-a', hlc: '00000000000000000001.00000000.aaaaaaaa' }));
    opLog.append(op({ originPeerId: 'peer-b', hlc: '00000000000000000002.00000000.bbbbbbbb' }));
    const a = opLog.readSince('peer-a', null);
    const b = opLog.readSince('peer-b', null);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0].originPeerId).toBe('peer-a');
    expect(b[0].originPeerId).toBe('peer-b');
  });
});
