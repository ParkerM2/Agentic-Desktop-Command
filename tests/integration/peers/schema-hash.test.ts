import { describe, expect, it } from 'vitest';

import { computeSchemaHash } from '@shared/replication/schema-hash';

describe('computeSchemaHash', () => {
  it('returns a 64-char lowercase hex SHA-256', () => {
    const h = computeSchemaHash(['0000_foo', '0001_bar']);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for identical input', () => {
    const a = computeSchemaHash(['0000_foo', '0001_bar']);
    const b = computeSchemaHash(['0000_foo', '0001_bar']);
    expect(a).toBe(b);
  });

  it('differs when a migration is added', () => {
    const before = computeSchemaHash(['0000_foo']);
    const after = computeSchemaHash(['0000_foo', '0001_bar']);
    expect(before).not.toBe(after);
  });

  it('is order-sensitive', () => {
    const a = computeSchemaHash(['0000_foo', '0001_bar']);
    const b = computeSchemaHash(['0001_bar', '0000_foo']);
    expect(a).not.toBe(b);
  });
});
