import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock electron's app module before importing connection
vi.mock('electron', () => ({
  app: { isPackaged: false },
}));

import { closeDatabase, initDatabase } from '@main/db';
import { busEvents, commands, sessions } from '@main/db/schema';

const migrationsFolder = join(__dirname, '../../../drizzle');

describe('database connection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'adc-test-'));
  });

  afterEach(() => {
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates adc.db in the specified directory', () => {
    initDatabase(tempDir, { migrationsFolder });
    expect(existsSync(join(tempDir, 'adc.db'))).toBe(true);
  });

  it('runs migrations and creates tables', () => {
    const db = initDatabase(tempDir, { migrationsFolder });
    const result = db.select().from(commands).all();
    expect(result).toEqual([]);
  });

  it('creates sessions table', () => {
    const db = initDatabase(tempDir, { migrationsFolder });
    const result = db.select().from(sessions).all();
    expect(result).toEqual([]);
  });

  it('creates bus_events table', () => {
    const db = initDatabase(tempDir, { migrationsFolder });
    const result = db.select().from(busEvents).all();
    expect(result).toEqual([]);
  });
});
