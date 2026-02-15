/**
 * Mock File System for testing
 *
 * Uses memfs to create an in-memory file system that can be used
 * in tests without touching the real file system.
 */

import type { IFs } from 'memfs';
import { createFsFromVolume, Volume } from 'memfs';
import { vi } from 'vitest';

/**
 * Creates a mock file system with optional initial files.
 *
 * @param files - Optional record of file paths to file contents
 * @returns An in-memory file system instance
 *
 * @example
 * ```ts
 * const fs = createMockFs({
 *   '/mock/userData/projects.json': '[]',
 *   '/mock/userData/settings.json': '{"theme":"dark"}',
 * });
 * ```
 */
export function createMockFs(files: Record<string, string> = {}): IFs {
  const vol = Volume.fromJSON(files);
  return createFsFromVolume(vol);
}

/**
 * Creates a mock file system and returns both the fs object and
 * helper functions for manipulation.
 */
export function createMockFsWithHelpers(files: Record<string, string> = {}) {
  const vol = Volume.fromJSON(files);
  const fs = createFsFromVolume(vol);

  return {
    fs,
    vol,

    /** Add or update a file in the mock filesystem */
    setFile(path: string, content: string): void {
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir.length > 0 && !vol.existsSync(dir)) {
        vol.mkdirSync(dir, { recursive: true });
      }
      vol.writeFileSync(path, content, { encoding: 'utf-8' });
    },

    /** Read a file from the mock filesystem */
    getFile(path: string): string | null {
      try {
        return vol.readFileSync(path, 'utf-8') as string;
      } catch {
        return null;
      }
    },

    /** Check if a file exists */
    exists(path: string): boolean {
      return vol.existsSync(path);
    },

    /** Reset the filesystem to initial state */
    reset(newFiles: Record<string, string> = {}): void {
      vol.reset();
      for (const [path, content] of Object.entries(newFiles)) {
        const dir = path.substring(0, path.lastIndexOf('/'));
        if (dir.length > 0 && !vol.existsSync(dir)) {
          vol.mkdirSync(dir, { recursive: true });
        }
        vol.writeFileSync(path, content, { encoding: 'utf-8' });
      }
    },

    /** Get a JSON snapshot of all files */
    toJSON(): Record<string, unknown> {
      return vol.toJSON();
    },
  };
}

/**
 * Default mock file system instance.
 * Can be used directly or replaced in individual tests.
 */
export const mockFs = createMockFs();

/**
 * Setup function to mock node:fs and node:fs/promises modules.
 * Call this in beforeEach or at the start of a test file.
 *
 * @param files - Optional initial files to populate the mock filesystem
 * @returns Helper object for filesystem manipulation
 */
export function setupFsMock(files: Record<string, string> = {}) {
  const helpers = createMockFsWithHelpers(files);

  vi.doMock('node:fs', () => helpers.fs);
  vi.doMock('node:fs/promises', () => helpers.fs.promises);

  return helpers;
}

/**
 * Creates mock fs modules for use with vi.mock.
 * Returns both sync and promise-based filesystem operations.
 */
export function createFsMockModules(files: Record<string, string> = {}) {
  const { fs, vol } = createMockFsWithHelpers(files);

  return {
    default: fs,
    ...fs,
    promises: fs.promises,
    _vol: vol,
  };
}
