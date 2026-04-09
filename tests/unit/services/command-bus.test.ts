import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { isPackaged: false },
}));

import { createCommandBus } from '@main/bus';
import { closeDatabase, initDatabase } from '@main/db';

const migrationsFolder = join(__dirname, '../../../drizzle');

describe('CommandBus', () => {
  let tempDir: string;
  let bus: ReturnType<typeof createCommandBus>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'adc-bus-test-'));
    const db = initDatabase(tempDir, { migrationsFolder });
    bus = createCommandBus(db);
  });

  afterEach(() => {
    bus.dispose();
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('dispatches a command and logs to SQLite', async () => {
    const handler = vi.fn().mockResolvedValue({ id: '1', title: 'Test' });
    bus.registerHandler('test.create.item', handler);

    const result = await bus.dispatch(
      'test.create.item',
      { title: 'Test' },
      { type: 'ui', name: 'TestComponent' },
    );

    expect(result.status).toBe('success');
    expect(result.output).toEqual({ id: '1', title: 'Test' });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(handler).toHaveBeenCalledWith({ title: 'Test' });

    // Verify logged to SQLite
    const logged = bus.queryCommands({ domain: 'test' });
    expect(logged).toHaveLength(1);
    expect(logged[0].channel).toBe('test.create.item');
    expect(logged[0].status).toBe('success');
  });

  it('logs errors for failed commands', async () => {
    bus.registerHandler('test.fail.item', () => Promise.reject(new Error('boom')));

    const result = await bus.dispatch(
      'test.fail.item',
      {},
      { type: 'system', name: 'test' },
    );

    expect(result.status).toBe('error');
    expect(result.error).toBe('boom');
  });

  it('returns error for unregistered channels', async () => {
    const result = await bus.dispatch('nonexistent.channel', {}, { type: 'ui' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('No handler registered');
  });

  it('emits events and logs to SQLite', () => {
    const handler = vi.fn();
    bus.on('event:test.item.created', handler);

    bus.emit('event:test.item.created', { id: '1' });

    expect(handler).toHaveBeenCalledWith('event:test.item.created', { id: '1' });

    const logged = bus.queryEvents({ channel: 'event:test.item.created' });
    expect(logged).toHaveLength(1);
  });

  it('parses channels into domain/verb/noun', () => {
    const handler = vi.fn().mockResolvedValue(null);
    bus.registerHandler('progress.create.task', handler);

    const registry = bus.getRegistry();
    const entry = registry.find((r) => r.channel === 'progress.create.task');
    expect(entry?.domain).toBe('progress');
    expect(entry?.verb).toBe('create');
    expect(entry?.noun).toBe('task');
    expect(entry?.isMutation).toBe(true);
  });
});
