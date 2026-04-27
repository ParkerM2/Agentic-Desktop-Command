import { describe, expect, it, vi, type Mock } from 'vitest';

import { applyColumnsToUserTableWith } from '@main/features/peers/replication-engine';

/**
 * Audit reference: tmp/audit/03-replication.md H8.
 *
 * `applyColumnsToUserTableWith` validates every incoming column name against
 * `SYNC_TABLE_DEFS[table].columns`. A column that passes the regex but is not
 * in the allowlist must throw — this stops a buggy/malicious peer from
 * scribbling unrelated columns into the user table even if their identifier
 * syntax is benign.
 */

interface FakeClient {
  prepare: Mock;
  stmt: { run: Mock; get: Mock };
}

function makeFakeClient(): FakeClient {
  const runMock = vi.fn(() => ({ changes: 1 }));
  const getMock = vi.fn();
  const stmt = { run: runMock, get: getMock };
  const prepareMock = vi.fn(() => stmt);
  return {
    prepare: prepareMock,
    stmt,
  };
}

describe('applyColumnsToUserTableWith — column allowlist', () => {
  it('throws when a column is not in the table allowlist', () => {
    const fake = makeFakeClient();
    expect(() =>
      applyColumnsToUserTableWith(
        fake,
        'notes',
        'note-1',
        { not_a_real_column: 'x' },
        'update',
      ),
    ).toThrow('peers: column not_a_real_column not in allowlist for notes');
    expect(fake.prepare).not.toHaveBeenCalled();
  });

  it('throws when the column name is the tombstone marker (passes regex but not allowlist)', () => {
    const fake = makeFakeClient();
    // `__deleted__` is the tombstone marker; it lives in row_meta only and
    // must never reach a user table. We build the columns object dynamically
    // because eslint's naming-convention rule rejects double-underscore
    // identifiers in object literals.
    const tombstoneCol = '__deleted__';
    const columns: Record<string, unknown> = {};
    columns[tombstoneCol] = true;
    expect(() =>
      applyColumnsToUserTableWith(fake, 'ideas', 'idea-1', columns, 'update'),
    ).toThrow('peers: column __deleted__ not in allowlist for ideas');
  });

  it('throws when the column has invalid identifier syntax (regex check still runs first)', () => {
    const fake = makeFakeClient();
    expect(() =>
      applyColumnsToUserTableWith(
        fake,
        'notes',
        'note-1',
        { 'id; DROP TABLE notes': 'x' },
        'update',
      ),
    ).toThrow('invalid column name in remote op: id; DROP TABLE notes');
  });

  it('allows real columns in the allowlist (insert path)', () => {
    const fake = makeFakeClient();
    applyColumnsToUserTableWith(
      fake,
      'notes',
      'note-1',
      { id: 'note-1', title: 't', content: 'c' },
      'insert',
    );
    expect(fake.prepare).toHaveBeenCalledTimes(1);
    const sql = String(fake.prepare.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/INSERT INTO notes/);
    expect(sql).toMatch(/ON CONFLICT\("id"\)/);
    expect(fake.stmt.run).toHaveBeenCalledWith('note-1', 't', 'c');
  });

  it('allows real columns in the allowlist (update path)', () => {
    const fake = makeFakeClient();
    applyColumnsToUserTableWith(
      fake,
      'progress_tasks',
      'slug-1',
      { status: 'done', updated_at: '2026-04-26T00:00:00Z' },
      'update',
    );
    expect(fake.prepare).toHaveBeenCalledTimes(1);
    const sql = String(fake.prepare.mock.calls[0]?.[0] ?? '');
    expect(sql).toMatch(/UPDATE progress_tasks/);
    expect(sql).toMatch(/WHERE "slug"=\?/);
    expect(fake.stmt.run).toHaveBeenCalledWith('done', '2026-04-26T00:00:00Z', 'slug-1');
  });

  it('is a no-op when columns is empty', () => {
    const fake = makeFakeClient();
    applyColumnsToUserTableWith(fake, 'notes', 'note-1', {}, 'update');
    expect(fake.prepare).not.toHaveBeenCalled();
  });
});
