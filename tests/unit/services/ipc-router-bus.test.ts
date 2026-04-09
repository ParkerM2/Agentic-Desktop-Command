import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock electron before any imports that touch it
vi.mock('electron', () => ({
  app: { isPackaged: false },
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: { getAllWindows: () => [] },
}));

// Mock the IPC contract so test channels have valid Zod schemas
import { z } from 'zod';

const passthrough = z.object({}).passthrough();
vi.mock('@shared/ipc-contract', () => ({
  ipcInvokeContract: new Proxy({}, {
    get: () => ({ input: passthrough, output: passthrough }),
  }),
}));

import { ipcMain } from 'electron';

import { createCommandBus } from '@main/bus';
import { closeDatabase, initDatabase } from '@main/db';
import { IpcRouter } from '@main/ipc/router';

import type { CommandBus } from '@main/bus';
import type { AdcDatabase } from '@main/db';

const migrationsFolder = join(__dirname, '../../../drizzle');

describe('IpcRouter bus integration', () => {
  let tempDir: string;
  let db: AdcDatabase;
  let bus: CommandBus;
  let router: IpcRouter;
  /** Captured ipcMain.handle callbacks keyed by channel */
  const ipcHandlers = new Map<string, (_event: unknown, rawInput: unknown) => Promise<unknown>>();

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'adc-router-bus-test-'));
    db = initDatabase(tempDir, { migrationsFolder });
    bus = createCommandBus(db);
    router = new IpcRouter(() => null);

    // Capture ipcMain.handle registrations so we can invoke them in tests
    ipcHandlers.clear();
    vi.mocked(ipcMain.handle).mockImplementation(((channel: string, handler: (...args: unknown[]) => unknown) => {
      ipcHandlers.set(channel, handler as (_event: unknown, rawInput: unknown) => Promise<unknown>);
    }) as typeof ipcMain.handle);
  });

  afterEach(() => {
    bus.dispose();
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('dispatches through bus when bus is attached', async () => {
    const handler = vi.fn().mockResolvedValue({ id: 'x', title: 'Test' });

    // Register handler on router BEFORE attaching bus (normal bootstrap order)
    router.handle('dashboard.listCaptures' as never, handler);

    // Attach bus — this should register all stored handlers on it
    router.setBus(bus);

    // Verify handler was registered on the bus
    const registry = bus.getRegistry();
    const entry = registry.find((r) => r.channel === 'dashboard.listCaptures');
    expect(entry).toBeDefined();

    // Simulate an IPC call through the captured ipcMain handler
    const ipcCallback = ipcHandlers.get('dashboard.listCaptures');
    expect(ipcCallback).toBeDefined();

    const result = await ipcCallback!({}, {});
    expect(result).toEqual({ success: true, data: { id: 'x', title: 'Test' } });
    expect(handler).toHaveBeenCalled();

    // Verify the command was logged to SQLite
    const logged = bus.queryCommands({ domain: 'dashboard' });
    expect(logged).toHaveLength(1);
    expect(logged[0].channel).toBe('dashboard.listCaptures');
    expect(logged[0].status).toBe('success');
    expect(logged[0].sourceType).toBe('ui');
  });

  it('falls back to direct handler call when no bus is attached', async () => {
    const handler = vi.fn().mockResolvedValue({ id: 'y' });
    router.handle('dashboard.listCaptures' as never, handler);

    // Do NOT attach bus — should use direct handler call
    const ipcCallback = ipcHandlers.get('dashboard.listCaptures');
    expect(ipcCallback).toBeDefined();

    const result = await ipcCallback!({}, {});
    expect(result).toEqual({ success: true, data: { id: 'y' } });
    expect(handler).toHaveBeenCalled();

    // No bus = no SQLite logging
    const logged = bus.queryCommands({ domain: 'dashboard' });
    expect(logged).toHaveLength(0);
  });

  it('returns error result when handler throws (with bus)', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    router.handle('dashboard.listCaptures' as never, handler);
    router.setBus(bus);

    const ipcCallback = ipcHandlers.get('dashboard.listCaptures');
    const result = await ipcCallback!({}, {});
    expect(result).toEqual({ success: false, error: 'boom' });

    // Error should be logged in SQLite
    const logged = bus.queryCommands({ domain: 'dashboard' });
    expect(logged).toHaveLength(1);
    expect(logged[0].status).toBe('error');
    expect(logged[0].error).toBe('boom');
  });

  it('registers handler on bus immediately if bus already attached', async () => {
    // Attach bus first, then register handler
    router.setBus(bus);

    const handler = vi.fn().mockResolvedValue({ late: true });
    router.handle('dashboard.listCaptures' as never, handler);

    // Handler should be on the bus
    const registry = bus.getRegistry();
    expect(registry.find((r) => r.channel === 'dashboard.listCaptures')).toBeDefined();

    // IPC call should flow through bus
    const ipcCallback = ipcHandlers.get('dashboard.listCaptures');
    const result = await ipcCallback!({}, {});
    expect(result).toEqual({ success: true, data: { late: true } });

    const logged = bus.queryCommands({ domain: 'dashboard' });
    expect(logged).toHaveLength(1);
  });

  it('emits events through bus when attached', () => {
    const emitSpy = vi.spyOn(bus, 'emit');
    router.setBus(bus);

    router.emit('event:dashboard.capture.changed' as never, { test: true } as never);

    expect(emitSpy).toHaveBeenCalledWith('event:dashboard.capture.changed', { test: true });
  });

  it('does not emit through bus when not attached', () => {
    const emitSpy = vi.spyOn(bus, 'emit');
    // No setBus call

    router.emit('event:dashboard.capture.changed' as never, { test: true } as never);

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
