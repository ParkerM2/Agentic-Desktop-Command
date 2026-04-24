/**
 * Unit tests for the per-hub DB resolver and the one-shot legacy
 * `adc.db` move into `hubs/legacy/adc.db`.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// electron's `app` is touched transitively via the logger on some platforms;
// avoid pulling in the real Electron runtime in a unit test context.
// vi.mock is hoisted above imports by the Vitest transform.
vi.mock('electron', () => ({ app: { isPackaged: false } }));

// eslint-disable-next-line import-x/first
import { migrateLegacyDb, resolveActiveDbPath } from '@main/features/hub/db-migrator';

describe('db-migrator', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dbmig-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('resolveActiveDbPath returns hubs/<id>/adc.db', () => {
    expect(resolveActiveDbPath(dir, 'abc')).toBe(join(dir, 'hubs', 'abc', 'adc.db'));
  });

  it('resolveActiveDbPath falls back to hubs/local when activeHubId is null', () => {
    expect(resolveActiveDbPath(dir, null)).toBe(join(dir, 'hubs', 'local', 'adc.db'));
  });

  it('migrateLegacyDb moves adc.db to hubs/legacy/adc.db', () => {
    writeFileSync(join(dir, 'adc.db'), 'sentinel');
    const r = migrateLegacyDb(dir);
    expect(r.moved).toBe(true);
    expect(existsSync(join(dir, 'adc.db'))).toBe(false);
    expect(readFileSync(join(dir, 'hubs', 'legacy', 'adc.db'), 'utf8')).toBe('sentinel');
  });

  it('migrateLegacyDb is idempotent — subsequent call is a no-op', () => {
    writeFileSync(join(dir, 'adc.db'), 'sentinel');
    migrateLegacyDb(dir);
    const r2 = migrateLegacyDb(dir);
    expect(r2.moved).toBe(false);
  });

  it('migrateLegacyDb does not overwrite existing destination', () => {
    writeFileSync(join(dir, 'adc.db'), 'source');
    mkdirSync(join(dir, 'hubs', 'legacy'), { recursive: true });
    writeFileSync(join(dir, 'hubs', 'legacy', 'adc.db'), 'existing');
    const r = migrateLegacyDb(dir);
    expect(r.moved).toBe(false);
    expect(readFileSync(join(dir, 'hubs', 'legacy', 'adc.db'), 'utf8')).toBe('existing');
    // Source should still exist since we refused to overwrite.
    expect(existsSync(join(dir, 'adc.db'))).toBe(true);
  });
});
