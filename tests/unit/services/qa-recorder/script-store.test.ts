/**
 * Unit Tests for QA Recorder ScriptStore
 *
 * Tests CRUD operations: list, get, save (create + update), and delete.
 *
 * Strategy: stub the AdcDatabase methods with vi.fn() so tests control
 * exactly what the Drizzle chain returns without needing to replicate
 * Drizzle's SQL expression objects (e.g. eq()).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createScriptStore } from '@main/features/qa/recorder/script-store';
import type { QaScript, ScriptStore } from '@main/features/qa/recorder/script-store';

// ── DB stub factory ────────────────────────────────────────────────────────

/**
 * Builds a vi.fn()-based AdcDatabase stub.
 *
 * Each method returns a fluent chain that terminates at .all() or .run().
 * The caller controls return values by swapping `allResult` / `runResult`
 * before each test operation.
 */
function createDbStub() {
  const stub = {
    allResult: [] as Array<Record<string, unknown>>,
    runResult: { changes: 0 },

    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  // Helpers that produce a chainable builder terminating at .all() or .run()
  const chainAll = () => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        all: vi.fn(() => stub.allResult),
      }),
      all: vi.fn(() => stub.allResult),
    }),
  });

  const chainRun = () => ({
    values: vi.fn().mockReturnValue({ run: vi.fn(() => stub.runResult) }),
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ run: vi.fn(() => stub.runResult) }),
    }),
    where: vi.fn().mockReturnValue({ run: vi.fn(() => stub.runResult) }),
  });

  stub.select.mockImplementation(chainAll);
  stub.insert.mockImplementation(() => chainRun());
  stub.update.mockImplementation(() => chainRun());
  stub.delete.mockImplementation(() => chainRun());

  return stub;
}

type DbStub = ReturnType<typeof createDbStub>;

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
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
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ScriptStore', () => {
  let db: DbStub;
  let store: ScriptStore;

  beforeEach(() => {
    db = createDbStub();
    store = createScriptStore(db as never);
  });

  // ── list() ─────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns an empty array when no scripts exist', () => {
      db.allResult = [];
      expect(store.list()).toEqual([]);
    });

    it('returns all scripts as QaScript objects', () => {
      db.allResult = [makeRow(), makeRow({ id: 'second-id', name: 'Second Script' })];
      const result = store.list();
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('seed-id');
      expect(result[1]?.id).toBe('second-id');
    });

    it('maps row fields to QaScript shape', () => {
      db.allResult = [makeRow()];
      const [script] = store.list();
      expect(script).toMatchObject<Partial<QaScript>>({
        id: 'seed-id',
        name: 'Seed Script',
        steps: expect.any(Array) as QaScript['steps'],
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
    });
  });

  // ── get() ──────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('returns the matching script when found', () => {
      db.allResult = [makeRow()];
      const result = store.get('seed-id');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('seed-id');
    });

    it('returns null when no rows match', () => {
      db.allResult = [];
      expect(store.get('nonexistent')).toBeNull();
    });
  });

  // ── save() — create ────────────────────────────────────────────────────

  describe('save() — create (no existing record)', () => {
    beforeEach(() => {
      // No existing record found → triggers insert path
      db.allResult = [];
      db.runResult = { changes: 1 };
    });

    it('returns a QaScript with the provided name', () => {
      const script = store.save({ name: 'New Script', steps: [] });
      expect(script.name).toBe('New Script');
    });

    it('generates an id when none is provided', () => {
      const script = store.save({ name: 'No ID', steps: [] });
      expect(script.id).toBeTruthy();
      expect(typeof script.id).toBe('string');
    });

    it('uses the provided id when given', () => {
      const script = store.save({ id: 'custom-id', name: 'Named', steps: [] });
      expect(script.id).toBe('custom-id');
    });

    it('sets createdAt and updatedAt on new records', () => {
      const script = store.save({ name: 'Timestamped', steps: [] });
      expect(script.createdAt).toBeTruthy();
      expect(script.updatedAt).toBeTruthy();
    });

    it('preserves the steps array in the returned script', () => {
      const steps = [{ type: 'navigate' as const, url: 'https://example.com' }];
      const script = store.save({ name: 'With Steps', steps });
      expect(script.steps).toEqual(steps);
    });
  });

  // ── save() — update ────────────────────────────────────────────────────

  describe('save() — update (existing record found)', () => {
    it('returns a script with the new name', () => {
      const existing = makeRow();
      db.allResult = [existing];
      db.runResult = { changes: 1 };

      const updated = store.save({ id: 'seed-id', name: 'Updated Name', steps: [] });
      expect(updated.name).toBe('Updated Name');
    });

    it('returns an updated updatedAt timestamp', () => {
      const existing = makeRow();
      db.allResult = [existing];
      db.runResult = { changes: 1 };

      const updated = store.save({ id: 'seed-id', name: 'Updated', steps: [] });
      expect(updated.updatedAt).not.toBe(existing.updatedAt);
    });

    it('preserves the original id', () => {
      const existing = makeRow();
      db.allResult = [existing];

      const updated = store.save({ id: 'seed-id', name: 'Updated', steps: [] });
      expect(updated.id).toBe('seed-id');
    });
  });

  // ── delete() ──────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('returns { success: true } when a row was deleted', () => {
      db.runResult = { changes: 1 };
      expect(store.delete('seed-id')).toEqual({ success: true });
    });

    it('returns { success: false } when no rows were deleted', () => {
      db.runResult = { changes: 0 };
      expect(store.delete('nonexistent')).toEqual({ success: false });
    });
  });
});
