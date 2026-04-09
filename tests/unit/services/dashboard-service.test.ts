import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { isPackaged: false },
}));

import { closeDatabase, initDatabase } from '@main/db';
import { captures } from '@main/db/schema';
import { createDashboardService } from '@main/services/dashboard/dashboard-service';

import type { AdcDatabase } from '@main/db';

const migrationsFolder = join(__dirname, '../../../drizzle');

describe('DashboardService (SQLite)', () => {
  let tempDir: string;
  let db: AdcDatabase;
  let service: ReturnType<typeof createDashboardService>;
  const router = { emit: vi.fn() } as unknown as Parameters<typeof createDashboardService>[0]['router'];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'adc-dash-test-'));
    db = initDatabase(tempDir, { migrationsFolder });
    service = createDashboardService({ db, router, dataDir: tempDir });
  });

  afterEach(() => {
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists captures (empty)', () => {
    expect(service.listCaptures()).toEqual([]);
  });

  it('creates a capture', () => {
    const capture = service.createCapture('hello world');
    expect(capture.text).toBe('hello world');
    expect(capture.id).toBeDefined();
    expect(capture.createdAt).toBeDefined();
    expect(router.emit).toHaveBeenCalled();
  });

  it('lists captures sorted by createdAt desc', () => {
    db.insert(captures).values({ id: 'c1', text: 'first', createdAt: '2026-01-01T00:00:00Z' }).run();
    db.insert(captures).values({ id: 'c2', text: 'second', createdAt: '2026-01-02T00:00:00Z' }).run();
    const list = service.listCaptures();
    expect(list).toHaveLength(2);
    expect(list[0].text).toBe('second');
    expect(list[1].text).toBe('first');
  });

  it('deletes a capture', () => {
    const capture = service.createCapture('to delete');
    const result = service.deleteCapture(capture.id);
    expect(result.success).toBe(true);
    expect(service.listCaptures()).toHaveLength(0);
  });

  it('throws on delete of nonexistent capture', () => {
    expect(() => service.deleteCapture('nonexistent')).toThrow('Capture not found');
  });

  it('migrates from JSON file', () => {
    closeDatabase();
    const tempDir2 = mkdtempSync(join(tmpdir(), 'adc-dash-migrate-'));
    writeFileSync(
      join(tempDir2, 'captures.json'),
      JSON.stringify({ captures: [{ id: 'c1', text: 'migrated', createdAt: '2026-01-01T00:00:00Z' }] }),
    );
    const db2 = initDatabase(tempDir2, { migrationsFolder });
    const svc2 = createDashboardService({ db: db2, router, dataDir: tempDir2 });
    const list = svc2.listCaptures();
    expect(list).toHaveLength(1);
    expect(list[0].text).toBe('migrated');
    closeDatabase();
    rmSync(tempDir2, { recursive: true, force: true });
  });
});
