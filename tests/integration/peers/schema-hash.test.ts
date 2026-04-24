import { describe, expect, it } from 'vitest';

import { computeSchemaHash } from '@shared/replication/schema-hash';

describe('computeSchemaHash', () => {
  it('returns a 64-char lowercase hex SHA-256', async () => {
    const h = await computeSchemaHash(['0000_foo', '0001_bar']);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for identical input', async () => {
    const a = await computeSchemaHash(['0000_foo', '0001_bar']);
    const b = await computeSchemaHash(['0000_foo', '0001_bar']);
    expect(a).toBe(b);
  });

  it('differs when a migration is added', async () => {
    const before = await computeSchemaHash(['0000_foo']);
    const after = await computeSchemaHash(['0000_foo', '0001_bar']);
    expect(before).not.toBe(after);
  });

  it('is order-sensitive', async () => {
    const a = await computeSchemaHash(['0000_foo', '0001_bar']);
    const b = await computeSchemaHash(['0001_bar', '0000_foo']);
    expect(a).not.toBe(b);
  });
});
