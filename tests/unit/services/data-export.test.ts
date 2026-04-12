/**
 * Unit Tests for Data Export/Import
 *
 * Tests export to archive, import with merge strategies, validation,
 * and error handling. Uses memfs for file system mocking.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// Mock logger
vi.mock('@main/lib/logger', () => ({
  createScopedLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
  serviceLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  appLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ── Path Mocking ────────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
    dirname: original.posix.dirname,
  };
});

// ── File System Mocking ─────────────────────────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;

  return { default: fs, ...fs };
});

// Mock store registry with minimal entries
vi.mock('@main/features/settings/data-management/store-registry', () => ({
  DATA_STORE_REGISTRY: [
    {
      id: 'notes',
      label: 'Notes',
      description: '',
      filePath: 'notes.json',
      isDirectory: false,
      lifecycle: 'persistent',
      encrypted: false,
      hubSynced: false,
      defaultRetention: { enabled: false },
      canClear: true,
      canExport: true,
      sensitive: false,
    },
    {
      id: 'oauth-tokens',
      label: 'OAuth Tokens',
      description: '',
      filePath: 'oauth-tokens.json',
      isDirectory: false,
      lifecycle: 'persistent',
      encrypted: true,
      hubSynced: false,
      defaultRetention: { enabled: false },
      canClear: false,
      canExport: false,
      sensitive: true,
    },
    {
      id: 'progress',
      label: 'Progress',
      description: '',
      filePath: 'progress/',
      isDirectory: true,
      lifecycle: 'transient',
      encrypted: false,
      hubSynced: false,
      defaultRetention: { enabled: true },
      canClear: true,
      canExport: true,
      sensitive: false,
    },
  ],
}));

const { exportData, importData } = await import(
  '@main/features/settings/data-management/data-export'
);

// ── Helpers ──────────────────────────────────────────────��──────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const posixPath = filePath.replace(/\\/g, '/');
    const dir = posixPath.substring(0, posixPath.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(posixPath, content, { encoding: 'utf-8' });
  }
}

const DATA_DIR = '/mock/data';

// ── Tests ────────────────────────────��──────────────────────────

describe('Data Export/Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    resetFs();
  });

  describe('exportData()', () => {
    it('exports non-sensitive, non-directory stores to a JSON archive', async () => {
      const { dialog } = await import('electron');
      (dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        canceled: false,
        filePath: '/mock/export.json',
      });

      resetFs({
        [posix.join(DATA_DIR, 'notes.json')]: JSON.stringify({ notes: [{ id: 'n1' }] }),
        [posix.join(DATA_DIR, 'oauth-tokens.json')]: JSON.stringify({ token: 'secret' }),
      });

      const vol = getMockVol();
      // Ensure output directory exists
      vol.mkdirSync('/mock', { recursive: true });

      const filePath = await exportData(DATA_DIR);

      expect(filePath).toBe('/mock/export.json');

      const archive = JSON.parse(
        vol.readFileSync('/mock/export.json', 'utf-8') as string,
      ) as Record<string, unknown>;

      expect(archive.version).toBe(1);
      expect(archive.exportedAt).toBeTruthy();
      const stores = archive.stores as Record<string, unknown>;
      expect(stores.notes).toBeDefined();
      // Sensitive stores should not be exported
      expect(stores['oauth-tokens']).toBeUndefined();
      // Directory stores should not be exported
      expect(stores.progress).toBeUndefined();
    });

    it('throws when dialog is cancelled', async () => {
      const { dialog } = await import('electron');
      (dialog.showSaveDialog as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        canceled: true,
        filePath: undefined,
      });

      await expect(exportData(DATA_DIR)).rejects.toThrow('Export cancelled');
    });
  });

  describe('importData()', () => {
    it('imports stores from a valid archive', () => {
      const archive = {
        version: 1,
        exportedAt: '2026-01-01T00:00:00Z',
        appVersion: '1.0.0',
        stores: {
          notes: { notes: [{ id: 'imported-1' }] },
        },
      };

      const archivePath = '/mock/archive.json';
      resetFs({
        [archivePath]: JSON.stringify(archive),
      });

      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const result = importData(DATA_DIR, archivePath);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);

      const notesPath = posix.join(DATA_DIR, 'notes.json');
      const imported = JSON.parse(
        vol.readFileSync(notesPath, 'utf-8') as string,
      ) as Record<string, unknown>;
      expect(imported.notes).toBeDefined();
    });

    it('merges arrays when both existing and imported are arrays', () => {
      const existingNotes = [{ id: 'existing-1' }];
      const importedNotes = [{ id: 'imported-1' }];

      const notesPath = posix.join(DATA_DIR, 'notes.json');
      resetFs({
        [notesPath]: JSON.stringify(existingNotes),
      });

      const archivePath = '/mock/archive.json';
      const vol = getMockVol();
      vol.writeFileSync(
        archivePath,
        JSON.stringify({
          version: 1,
          exportedAt: '',
          appVersion: '1.0.0',
          stores: { notes: importedNotes },
        }),
      );

      importData(DATA_DIR, archivePath);

      const result = JSON.parse(
        vol.readFileSync(notesPath, 'utf-8') as string,
      ) as unknown[];
      expect(result).toHaveLength(2);
    });

    it('merges objects when both are records', () => {
      const notesPath = posix.join(DATA_DIR, 'notes.json');
      resetFs({
        [notesPath]: JSON.stringify({ notes: [{ id: 'e1' }], meta: 'existing' }),
      });

      const archivePath = '/mock/archive.json';
      const vol = getMockVol();
      vol.writeFileSync(
        archivePath,
        JSON.stringify({
          version: 1,
          exportedAt: '',
          appVersion: '1.0.0',
          stores: { notes: { notes: [{ id: 'i1' }], extra: 'new' } },
        }),
      );

      importData(DATA_DIR, archivePath);

      const result = JSON.parse(
        vol.readFileSync(notesPath, 'utf-8') as string,
      ) as Record<string, unknown>;
      // notes arrays should be concatenated
      expect((result.notes as unknown[]).length).toBe(2);
      expect(result.extra).toBe('new');
      expect(result.meta).toBe('existing');
    });

    it('throws for non-existent import file', () => {
      expect(() => importData(DATA_DIR, '/nonexistent.json')).toThrow('Import file not found');
    });

    it('throws for invalid archive format (not an object)', () => {
      const archivePath = '/mock/bad.json';
      resetFs({ [archivePath]: '"just a string"' });

      expect(() => importData(DATA_DIR, archivePath)).toThrow('Invalid archive format');
    });

    it('throws for unsupported archive version', () => {
      const archivePath = '/mock/v2.json';
      resetFs({
        [archivePath]: JSON.stringify({ version: 99, stores: {} }),
      });

      expect(() => importData(DATA_DIR, archivePath)).toThrow('Unsupported archive version');
    });

    it('skips unknown or sensitive store IDs', () => {
      const archivePath = '/mock/archive.json';
      resetFs({
        [archivePath]: JSON.stringify({
          version: 1,
          exportedAt: '',
          appVersion: '1.0.0',
          stores: {
            'unknown-store': { data: true },
            'oauth-tokens': { secret: true },
          },
        }),
      });

      const vol = getMockVol();
      vol.mkdirSync(DATA_DIR, { recursive: true });

      const result = importData(DATA_DIR, archivePath);
      expect(result.imported).toBe(0);
    });

    it('throws for archive with missing stores key', () => {
      const archivePath = '/mock/no-stores.json';
      resetFs({
        [archivePath]: JSON.stringify({ version: 1 }),
      });

      expect(() => importData(DATA_DIR, archivePath)).toThrow('missing stores');
    });
  });
});
