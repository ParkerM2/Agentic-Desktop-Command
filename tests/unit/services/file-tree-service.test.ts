/**
 * Unit Tests for FileTreeService
 *
 * Tests directory tree reading with memfs for filesystem mocking.
 */

import { posix } from 'node:path';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking ──────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
    basename: original.posix.basename,
    extname: original.posix.extname,
    relative: original.posix.relative,
  };
});

// ── File System Mocking ─────────────────────────────��─────────

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

const { createFileTreeService } = await import(
  '@main/features/files/files-service'
);

// ── Helpers ───────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const p = filePath.replace(/\\/g, '/');
    const dir = p.substring(0, p.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(p, content, { encoding: 'utf-8' });
  }
}

const ROOT = '/project';

// ── Tests ─────────────────────────────────────────────────────

describe('FileTreeService', () => {
  beforeEach(() => {
    resetFs();
  });

  it('returns an empty array for an empty directory', () => {
    const vol = getMockVol();
    vol.mkdirSync(ROOT, { recursive: true });

    const service = createFileTreeService();
    const result = service.listTree(ROOT);

    expect(result).toEqual([]);
  });

  it('lists files with correct names and extensions', () => {
    resetFs({
      [posix.join(ROOT, 'readme.md')]: '# Hello',
      [posix.join(ROOT, 'index.ts')]: 'export {}',
    });

    const service = createFileTreeService();
    const result = service.listTree(ROOT);

    expect(result).toHaveLength(2);
    const names = result.map((n) => n.name);
    expect(names).toContain('index.ts');
    expect(names).toContain('readme.md');

    const tsNode = result.find((n) => n.name === 'index.ts');
    expect(tsNode?.extension).toBe('ts');
    expect(tsNode?.isDirectory).toBe(false);
    expect(tsNode?.children).toBeNull();
  });

  it('sorts directories before files, then alphabetically', () => {
    const vol = getMockVol();
    vol.mkdirSync(posix.join(ROOT, 'src'), { recursive: true });
    vol.mkdirSync(posix.join(ROOT, 'docs'), { recursive: true });
    vol.writeFileSync(posix.join(ROOT, 'package.json'), '{}');
    vol.writeFileSync(posix.join(ROOT, 'README.md'), '');

    const service = createFileTreeService();
    const result = service.listTree(ROOT);

    // Directories first: docs, src; then files: README.md, package.json
    // But hidden files (starting with .) are skipped, so README.md is visible
    expect(result[0]?.isDirectory).toBe(true);
    expect(result[1]?.isDirectory).toBe(true);
    expect(result[2]?.isDirectory).toBe(false);
    expect(result[3]?.isDirectory).toBe(false);
  });

  it('recurses into subdirectories', () => {
    resetFs({
      [posix.join(ROOT, 'src/main.ts')]: 'console.log("hi")',
    });

    const service = createFileTreeService();
    const result = service.listTree(ROOT);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('src');
    expect(result[0]?.isDirectory).toBe(true);
    expect(result[0]?.children).toHaveLength(1);
    expect(result[0]?.children?.[0]?.name).toBe('main.ts');
  });

  it('skips node_modules, .git, and other excluded directories', () => {
    const vol = getMockVol();
    vol.mkdirSync(posix.join(ROOT, 'node_modules/foo'), { recursive: true });
    vol.mkdirSync(posix.join(ROOT, 'src'), { recursive: true });
    vol.writeFileSync(posix.join(ROOT, 'node_modules/foo/index.js'), '');
    vol.writeFileSync(posix.join(ROOT, 'src/app.ts'), '');

    const service = createFileTreeService();
    const result = service.listTree(ROOT);

    const names = result.map((n) => n.name);
    expect(names).not.toContain('node_modules');
    expect(names).toContain('src');
  });

  it('skips dotfiles (except .env.example)', () => {
    resetFs({
      [posix.join(ROOT, '.env')]: 'SECRET=123',
      [posix.join(ROOT, '.env.example')]: 'SECRET=',
      [posix.join(ROOT, '.eslintrc.json')]: '{}',
      [posix.join(ROOT, 'app.ts')]: '',
    });

    const service = createFileTreeService();
    const result = service.listTree(ROOT);

    const names = result.map((n) => n.name);
    expect(names).toContain('.env.example');
    expect(names).toContain('app.ts');
    expect(names).not.toContain('.env');
    expect(names).not.toContain('.eslintrc.json');
  });

  it('returns empty array for nonexistent directory', () => {
    const service = createFileTreeService();
    const result = service.listTree('/nonexistent');

    expect(result).toEqual([]);
  });

  it('sets isModified to false for all nodes', () => {
    resetFs({
      [posix.join(ROOT, 'file.ts')]: 'code',
    });

    const service = createFileTreeService();
    const result = service.listTree(ROOT);

    expect(result[0]?.isModified).toBe(false);
  });

  it('handles files without extensions', () => {
    resetFs({
      [posix.join(ROOT, 'Makefile')]: 'all:',
    });

    const service = createFileTreeService();
    const result = service.listTree(ROOT);

    expect(result[0]?.name).toBe('Makefile');
    expect(result[0]?.extension).toBeNull();
  });
});
