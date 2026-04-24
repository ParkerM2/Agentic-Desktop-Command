import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Op } from '@shared/replication/op-types';

import type { AgentManager } from '@main/agent-host/agent-host-client';
import * as schema from '@main/db/schema';
import { createReplicationEngine } from '@main/features/peers/replication-engine';
import { createProgressService } from '@main/features/progress/progress-service';

describe('progress-service <-> replication-engine', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let tmpRoot: string;

  beforeEach(async () => {
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
    tmpRoot = await mkdtemp(join(tmpdir(), 'adc-progress-test-'));
  });

  afterEach(async () => {
    sqlite.close();
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('createTask records an insert op', async () => {
    const engine = createReplicationEngine({
      db,
      peerIdShort: 'aaaaaaaa',
      peerIdFull: 'peer-a',
    });
    const spy = vi.fn<(op: Op) => void>();
    engine.onLocalOp(spy);

    const service = createProgressService(
      tmpRoot,
      // agentHostClient is not used by createTask; cast for test-only stub
      {} as AgentManager,
      db,
      engine,
    );

    await service.createTask('plan-xyz', 'Test plan', 'desc', 'normal');

    expect(spy).toHaveBeenCalledOnce();
    const op = spy.mock.calls[0][0];
    expect(op.opType).toBe('insert');
    expect(op.pk).toBe('plan-xyz');
    expect(op.tableName).toBe('progress_tasks');
    expect(op.payload.title.value).toBe('Test plan');
    expect(op.payload.slug.value).toBe('plan-xyz');
    expect(op.payload.status.value).toBe('backlog');
  });

  it('updateTask records an update op with snake_case columns', async () => {
    const engine = createReplicationEngine({
      db,
      peerIdShort: 'aaaaaaaa',
      peerIdFull: 'peer-a',
    });

    const service = createProgressService(tmpRoot, {} as AgentManager, db, engine);
    await service.createTask('plan-upd', 'Original', '', 'normal');

    const spy = vi.fn<(op: Op) => void>();
    engine.onLocalOp(spy);

    await service.updateTask('plan-upd', { title: 'Renamed', status: 'executing' });

    expect(spy).toHaveBeenCalledOnce();
    const op = spy.mock.calls[0][0];
    expect(op.opType).toBe('update');
    expect(op.pk).toBe('plan-upd');
    expect(op.payload.title.value).toBe('Renamed');
    expect(op.payload.status.value).toBe('executing');
    expect(op.payload.updated_at).toBeDefined();
  });

  it('deleteTask records a delete op', async () => {
    const engine = createReplicationEngine({
      db,
      peerIdShort: 'aaaaaaaa',
      peerIdFull: 'peer-a',
    });

    const service = createProgressService(tmpRoot, {} as AgentManager, db, engine);
    await service.createTask('plan-del', 'To delete', '', 'normal');

    const spy = vi.fn<(op: Op) => void>();
    engine.onLocalOp(spy);

    await service.deleteTask('plan-del');

    expect(spy).toHaveBeenCalledOnce();
    const op = spy.mock.calls[0][0];
    expect(op.opType).toBe('delete');
    expect(op.pk).toBe('plan-del');
    expect(op.payload).toEqual({});
  });
});
