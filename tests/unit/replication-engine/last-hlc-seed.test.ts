import { describe, expect, it } from 'vitest';

import { seedLastHlcFromDb } from '@main/features/peers/replication-engine';

/**
 * Pure-helper unit tests for the engine's lastHlc seed step.
 *
 * The full end-to-end path (engine A writes ops, restarts, engine B inherits
 * the wall.counter pointer via op_log) requires better-sqlite3 + drizzle, which
 * lives under tests/integration/peers. Here we just verify the SQL prepare/get
 * shape that the engine relies on.
 *
 * Audit reference: tmp/audit/03-replication.md C6.
 */

function makeFakeClient(
  result?: { m: string | null },
): { prepare: (sql: string) => { get: () => unknown } } {
  return {
    prepare(sql: string) {
      if (!sql.includes('MAX(hlc)')) {
        throw new Error(`unexpected SQL: ${sql}`);
      }
      return {
        get: () => result,
      };
    },
  };
}

describe('seedLastHlcFromDb', () => {
  it('returns null when op_log is empty (no row)', () => {
    expect(seedLastHlcFromDb(makeFakeClient())).toBeNull();
  });

  it('returns null when MAX(hlc) is null (empty table aggregation)', () => {
    expect(seedLastHlcFromDb(makeFakeClient({ m: null }))).toBeNull();
  });

  it('returns the parsed HLC string when op_log has rows', () => {
    const hlc = '0000000099999.00000001.aaaaaaaa';
    expect(seedLastHlcFromDb(makeFakeClient({ m: hlc }))).toBe(hlc);
  });

  it('throws on a malformed HLC so the caller can warn rather than silently corrupt', () => {
    expect(() => seedLastHlcFromDb(makeFakeClient({ m: 'not-an-hlc' }))).toThrow();
  });
});
