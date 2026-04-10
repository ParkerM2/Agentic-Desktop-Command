/**
 * Unit Tests for QA Recorder ScriptStore
 *
 * Tests CRUD operations: list, get, save (create + update), and delete.
 * Uses a minimal in-memory mock of AdcDatabase rather than a real SQLite file.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { createScriptStore } from '@main/features/qa/recorder/script-store';
import type { QaScript, ScriptStore } from '@main/features/qa/recorder/script-store';

// ── Minimal DB Mock ────────────────────────────────────────────────────────

/**
 * Builds a lightweight in-memory DB mock whose chain methods (`select`,
 * `insert`, `update`, `delete`, `from`, `where`, `set`, `values`, `all`,
 * `run`) satisfy the call patterns used by script-store.ts.
 */
function createMockDb() {
  const rows: Array<Record<string, unknown>> = [];

  // Shared fluent builder that different operations attach onto
  const builder = {
    _rows: rows,
    _filter: null as ((r: Record<string, unknown>) => boolean) | null,
    _setData: null as Record<string, unknown> | null,
    _insertData: null as Record<string, unknown> | null,

    where(predicate: (r: Record<string, unknown>) => boolean) {
      this._filter = predicate;
      return this;
    },

    all(): Array<Record<string, unknown>> {
      const result = this._filter ? this._rows.filter(this._filter) : [...this._rows];
      this._filter = null;
      return result;
    },

    run() {
      if (this._insertData) {
        this._rows.push(this._insertData);
        this._insertData = null;
        return { changes: 1 };
      }
      if (this._setData && this._filter) {
        let changes = 0;
        for (const row of this._rows) {
          if (this._filter(row)) {
            Object.assign(row, this._setData);
            changes++;
          }
        }
        this._filter = null;
        this._setData = null;
        return { changes };
      }
      if (this._filter) {
        // delete
        const before = this._rows.length;
        const toKeep = this._rows.filter((r) => !this._filter!(r));
        this._rows.splice(0, this._rows.length, ...toKeep);
        this._filter = null;
        return { changes: before - this._rows.length };
      }
      return { changes: 0 };
    },
  };

  return {
    _rows: rows,
    select() {
      return {
        from() {
          return builder;
        },
      };
    },
    insert(_table: unknown) {
      return {
        values(data: Record<string, unknown>) {
          builder._insertData = { ...data };
          return builder;
        },
      };
    },
    update(_table: unknown) {
      return {
        set(data: Record<string, unknown>) {
          builder._setData = { ...data };
          return builder;
        },
      };
    },
    delete(_table: unknown) {
      return builder;
    },
  };
}

type MockDb = ReturnType<typeof createMockDb>;

// ── Helpers ────────────────────────────────────────────────────────────────

function seedRecord(db: MockDb, overrides: Partial<Record<string, unknown>> = {}) {
  const record = {
    id: 'seed-id',
    name: 'Seed Script',
    baseUrl: 'https://example.com',
    steps: [{ type: 'navigate', url: 'https://example.com' }],
    projectId: null,
    filePath: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
  db._rows.push(record);
  return record;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ScriptStore', () => {
  let db: MockDb;
  let store: ScriptStore;

  beforeEach(() => {
    db = createMockDb();
    // Cast: our mock satisfies the used surface of AdcDatabase
    store = createScriptStore(db as never);
  });

  // ── list() ─────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns an empty array when no scripts exist', () => {
      expect(store.list()).toEqual([]);
    });

    it('returns all scripts as QaScript objects', () => {
      seedRecord(db);
      seedRecord(db, { id: 'second-id', name: 'Second Script' });

      const result = store.list();
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('seed-id');
      expect(result[1]?.id).toBe('second-id');
    });

    it('maps row fields to QaScript shape', () => {
      seedRecord(db);
      const [script] = store.list();

      expect(script).toMatchObject<Partial<QaScript>>({
        id: 'seed-id',
        name: 'Seed Script',
        steps: expect.any(Array) as unknown[],
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
    });
  });

  // ── get() ──────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('returns the matching script by id', () => {
      seedRecord(db);
      const result = store.get('seed-id');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('seed-id');
    });

    it('returns null when id does not exist', () => {
      expect(store.get('nonexistent')).toBeNull();
    });
  });

  // ── save() — create ────────────────────────────────────────────────────

  describe('save() — create', () => {
    it('inserts a new record when no id is provided', () => {
      const script = store.save({ name: 'New Script', steps: [] });
      expect(script.id).toBeTruthy();
      expect(script.name).toBe('New Script');
      expect(db._rows).toHaveLength(1);
    });

    it('uses provided id when given', () => {
      const script = store.save({ id: 'custom-id', name: 'Named', steps: [] });
      expect(script.id).toBe('custom-id');
    });

    it('sets createdAt and updatedAt on new records', () => {
      const script = store.save({ name: 'Timestamped', steps: [] });
      expect(script.createdAt).toBeTruthy();
      expect(script.updatedAt).toBeTruthy();
    });

    it('persists steps array correctly', () => {
      const steps = [{ type: 'navigate', url: 'https://example.com' }];
      const script = store.save({ name: 'With Steps', steps });
      expect(script.steps).toEqual(steps);
    });
  });

  // ── save() — update ────────────────────────────────────────────────────

  describe('save() — update', () => {
    it('updates name when id matches an existing record', () => {
      seedRecord(db);
      const updated = store.save({ id: 'seed-id', name: 'Updated Name', steps: [] });
      expect(updated.name).toBe('Updated Name');
    });

    it('does not add a new row when updating', () => {
      seedRecord(db);
      store.save({ id: 'seed-id', name: 'Updated Name', steps: [] });
      expect(db._rows).toHaveLength(1);
    });

    it('refreshes updatedAt on update', () => {
      const original = seedRecord(db);
      const updated = store.save({ id: 'seed-id', name: 'Updated', steps: [] });
      expect(updated.updatedAt).not.toBe(original.updatedAt);
    });
  });

  // ── delete() ──────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('removes the record and returns success: true', () => {
      seedRecord(db);
      const result = store.delete('seed-id');
      expect(result).toEqual({ success: true });
      expect(db._rows).toHaveLength(0);
    });

    it('returns success: false when id does not exist', () => {
      const result = store.delete('nonexistent');
      expect(result).toEqual({ success: false });
    });
  });
});
