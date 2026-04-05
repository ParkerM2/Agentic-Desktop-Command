/**
 * Unit Tests for Import Parser
 *
 * Tests import specifier extraction, tsconfig path loading,
 * specifier resolution, and source file collection.
 * Mocks node:fs and node:path for memfs compatibility.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking (use posix.join for memfs compatibility on Windows) ──

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    default: { ...original, join: original.posix.join },
    join: original.posix.join,
    resolve: original.posix.resolve,
    dirname: original.posix.dirname,
    extname: original.posix.extname,
    isAbsolute: original.posix.isAbsolute,
    relative: original.posix.relative,
    basename: original.posix.basename,
  };
});

// ── File System Mocking ────────────────────────────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;
  (globalThis as Record<string, unknown>).__mockFs = fs;

  return {
    default: fs,
    ...fs,
  };
});

// Import after mocks are set up
const { extractImportSpecifiers, loadTsconfigPaths, resolveSpecifier, collectSourceFiles } =
  await import('@main/services/visualization/import-parser');

// ── Helpers ─────────────────────────────────────────────────────────

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

// ── Tests ───────────────────────────────────────────────────────────

describe('Import Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    resetFs();
  });

  // ── extractImportSpecifiers() ─────────────────────────────────

  describe('extractImportSpecifiers()', () => {
    it('extracts static imports', () => {
      const src = `import { foo } from './foo';
import bar from '../bar';`;
      const result = extractImportSpecifiers(src);
      expect(result).toContain('./foo');
      expect(result).toContain('../bar');
    });

    it('extracts type imports', () => {
      const src = `import type { Foo } from './types';`;
      const result = extractImportSpecifiers(src);
      expect(result).toContain('./types');
    });

    it('extracts dynamic imports', () => {
      const src = `const mod = await import('./dynamic');`;
      const result = extractImportSpecifiers(src);
      expect(result).toContain('./dynamic');
    });

    it('extracts require calls', () => {
      const src = `const fs = require('node:fs');`;
      const result = extractImportSpecifiers(src);
      expect(result).toContain('node:fs');
    });

    it('extracts export-from specifiers', () => {
      const src = `export { foo } from './foo';
export * from './bar';
export * as baz from './baz';`;
      const result = extractImportSpecifiers(src);
      expect(result).toContain('./foo');
      expect(result).toContain('./bar');
      expect(result).toContain('./baz');
    });

    it('extracts export type from specifiers', () => {
      const src = `export type { Foo } from './types';`;
      const result = extractImportSpecifiers(src);
      expect(result).toContain('./types');
    });

    it('deduplicates specifiers', () => {
      const src = `import { a } from './shared';
import { b } from './shared';`;
      const result = extractImportSpecifiers(src);
      const sharedCount = result.filter((s) => s === './shared').length;
      expect(sharedCount).toBe(1);
    });

    it('returns empty array for source with no imports', () => {
      const src = `const x = 42;\nconsole.log(x);`;
      const result = extractImportSpecifiers(src);
      expect(result).toEqual([]);
    });

    it('handles mixed import styles', () => {
      const src = `import { a } from './a';
import('./b');
require('./c');
export * from './d';`;
      const result = extractImportSpecifiers(src);
      expect(result).toHaveLength(4);
      expect(result).toContain('./a');
      expect(result).toContain('./b');
      expect(result).toContain('./c');
      expect(result).toContain('./d');
    });
  });

  // ── loadTsconfigPaths() ───────────────────────────────────────

  describe('loadTsconfigPaths()', () => {
    it('returns empty config when tsconfig.json does not exist', () => {
      const result = loadTsconfigPaths('/project');
      expect(result).toEqual({ paths: {}, baseUrl: null });
    });

    it('parses paths and strips trailing /*', () => {
      resetFs({
        '/project/tsconfig.json': JSON.stringify({
          compilerOptions: {
            paths: {
              '@shared/*': ['./src/shared/*'],
              '@main/*': ['./src/main/*'],
            },
          },
        }),
      });
      const result = loadTsconfigPaths('/project');
      expect(result.paths).toHaveProperty('@shared');
      expect(result.paths).toHaveProperty('@main');
      expect(result.paths['@shared']).toEqual(['/project/src/shared']);
      expect(result.paths['@main']).toEqual(['/project/src/main']);
    });

    it('resolves baseUrl relative to tsconfig', () => {
      resetFs({
        '/project/tsconfig.json': JSON.stringify({
          compilerOptions: {
            baseUrl: './src',
          },
        }),
      });
      const result = loadTsconfigPaths('/project');
      expect(result.baseUrl).toBe('/project/src');
    });

    it('handles tsconfig with comments and trailing commas', () => {
      resetFs({
        '/project/tsconfig.json': `{
  // This is a comment
  "compilerOptions": {
    "paths": {
      "@ui/*": ["./src/ui/*"],
    },
  },
}`,
      });
      const result = loadTsconfigPaths('/project');
      expect(result.paths).toHaveProperty('@ui');
    });

    it('returns empty config for malformed JSON', () => {
      resetFs({
        '/project/tsconfig.json': 'not valid json {{{',
      });
      const result = loadTsconfigPaths('/project');
      expect(result).toEqual({ paths: {}, baseUrl: null });
    });

    it('returns empty paths when compilerOptions is missing', () => {
      resetFs({
        '/project/tsconfig.json': JSON.stringify({}),
      });
      const result = loadTsconfigPaths('/project');
      expect(result).toEqual({ paths: {}, baseUrl: null });
    });
  });

  // ── resolveSpecifier() ────────────────────────────────────────

  describe('resolveSpecifier()', () => {
    it('resolves relative specifiers to existing files', () => {
      resetFs({
        '/project/src/a.ts': 'export const a = 1;',
        '/project/src/b.ts': 'import { a } from "./a";',
      });
      const result = resolveSpecifier('./a', '/project/src/b.ts', { paths: {}, baseUrl: null });
      expect(result).toBe('/project/src/a.ts');
    });

    it('resolves relative specifiers without extension', () => {
      resetFs({
        '/project/src/utils.ts': 'export const u = 1;',
        '/project/src/main.ts': '',
      });
      const result = resolveSpecifier('./utils', '/project/src/main.ts', { paths: {}, baseUrl: null });
      expect(result).toBe('/project/src/utils.ts');
    });

    it('resolves index files in directories', () => {
      resetFs({
        '/project/src/lib/index.ts': 'export const lib = 1;',
        '/project/src/main.ts': '',
      });
      const result = resolveSpecifier('./lib', '/project/src/main.ts', { paths: {}, baseUrl: null });
      expect(result).toBe('/project/src/lib/index.ts');
    });

    it('resolves path aliases', () => {
      resetFs({
        '/project/src/shared/types.ts': 'export type X = string;',
      });
      const pathConfig = {
        paths: { '@shared': ['/project/src/shared'] },
        baseUrl: null,
      };
      const result = resolveSpecifier('@shared/types', '/project/src/main.ts', pathConfig);
      expect(result).toBe('/project/src/shared/types.ts');
    });

    it('returns null for external packages', () => {
      const result = resolveSpecifier('react', '/project/src/main.ts', { paths: {}, baseUrl: null });
      expect(result).toBeNull();
    });

    it('returns null when alias matches but file not found', () => {
      const pathConfig = {
        paths: { '@shared': ['/project/src/shared'] },
        baseUrl: null,
      };
      const result = resolveSpecifier('@shared/nonexistent', '/project/src/main.ts', pathConfig);
      expect(result).toBeNull();
    });

    it('resolves via baseUrl', () => {
      resetFs({
        '/project/src/utils/helper.ts': 'export const h = 1;',
      });
      const pathConfig = {
        paths: {},
        baseUrl: '/project/src',
      };
      const result = resolveSpecifier('utils/helper', '/project/src/main.ts', pathConfig);
      expect(result).toBe('/project/src/utils/helper.ts');
    });

    it('resolves parent directory imports', () => {
      resetFs({
        '/project/src/shared.ts': 'export const s = 1;',
        '/project/src/sub/main.ts': '',
      });
      const result = resolveSpecifier('../shared', '/project/src/sub/main.ts', { paths: {}, baseUrl: null });
      expect(result).toBe('/project/src/shared.ts');
    });
  });

  // ── collectSourceFiles() ──────────────────────────────────────

  describe('collectSourceFiles()', () => {
    it('collects .ts and .tsx files recursively', () => {
      resetFs({
        '/project/src/a.ts': '',
        '/project/src/b.tsx': '',
        '/project/src/sub/c.ts': '',
      });
      const files = collectSourceFiles('/project/src');
      expect(files).toHaveLength(3);
      expect(files).toContain('/project/src/a.ts');
      expect(files).toContain('/project/src/b.tsx');
      expect(files).toContain('/project/src/sub/c.ts');
    });

    it('collects .js and .jsx files', () => {
      resetFs({
        '/project/src/a.js': '',
        '/project/src/b.jsx': '',
      });
      const files = collectSourceFiles('/project/src');
      expect(files).toHaveLength(2);
    });

    it('skips node_modules and other excluded directories', () => {
      resetFs({
        '/project/src/a.ts': '',
        '/project/src/node_modules/pkg/index.ts': '',
        '/project/src/.git/hooks/pre-commit.ts': '',
        '/project/src/dist/bundle.ts': '',
      });
      const files = collectSourceFiles('/project/src');
      expect(files).toHaveLength(1);
      expect(files).toContain('/project/src/a.ts');
    });

    it('ignores non-source files', () => {
      resetFs({
        '/project/src/readme.md': '',
        '/project/src/data.json': '',
        '/project/src/style.css': '',
        '/project/src/app.ts': '',
      });
      const files = collectSourceFiles('/project/src');
      expect(files).toHaveLength(1);
      expect(files).toContain('/project/src/app.ts');
    });

    it('returns empty array for non-existent directory', () => {
      const files = collectSourceFiles('/nonexistent');
      expect(files).toEqual([]);
    });

    it('returns empty array for empty directory', () => {
      const vol = getMockVol();
      vol.mkdirSync('/empty', { recursive: true });
      const files = collectSourceFiles('/empty');
      expect(files).toEqual([]);
    });
  });
});
