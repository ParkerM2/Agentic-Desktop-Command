/**
 * Unit Tests for Codebase Graph Builder
 *
 * Tests framework detection, file grouping, and graph building.
 * Mocks node:fs and node:path for memfs compatibility.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking ──────────────────────────────────────────────────

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
const { detectFramework, getFileGroup, buildCodebaseGraph } =
  await import('@main/features/visualization/codebase-graph');

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

describe('Codebase Graph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    resetFs();
  });

  // ── detectFramework() ─────────────────────────────────────────

  describe('detectFramework()', () => {
    it('detects electron from dependencies', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          dependencies: { electron: '^29.0.0' },
        }),
      });
      expect(detectFramework('/project')).toBe('electron');
    });

    it('detects electron-vite from devDependencies', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          devDependencies: { 'electron-vite': '^2.0.0' },
        }),
      });
      expect(detectFramework('/project')).toBe('electron');
    });

    it('detects nextjs', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          dependencies: { next: '^14.0.0', react: '^18.0.0' },
        }),
      });
      expect(detectFramework('/project')).toBe('nextjs');
    });

    it('detects vite-spa', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          devDependencies: { vite: '^5.0.0' },
        }),
      });
      expect(detectFramework('/project')).toBe('vite-spa');
    });

    it('detects node-server with express', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          dependencies: { express: '^4.0.0' },
        }),
      });
      expect(detectFramework('/project')).toBe('node-server');
    });

    it('detects node-server with fastify', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          dependencies: { fastify: '^4.0.0' },
        }),
      });
      expect(detectFramework('/project')).toBe('node-server');
    });

    it('returns unknown when no package.json', () => {
      expect(detectFramework('/project')).toBe('unknown');
    });

    it('returns unknown when no known framework detected', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          dependencies: { lodash: '^4.0.0' },
        }),
      });
      expect(detectFramework('/project')).toBe('unknown');
    });

    it('returns unknown for malformed package.json', () => {
      resetFs({
        '/project/package.json': 'not json',
      });
      expect(detectFramework('/project')).toBe('unknown');
    });
  });

  // ── getFileGroup() ────────────────────────────────────────────

  describe('getFileGroup()', () => {
    it('groups electron renderer features', () => {
      expect(getFileGroup('src/renderer/features/tasks/TaskList.tsx', 'electron')).toBe('features/tasks');
    });

    it('groups electron main services', () => {
      expect(getFileGroup('src/main/services/project/project-service.ts', 'electron')).toBe('main/services/project');
    });

    it('groups electron main/ipc', () => {
      expect(getFileGroup('src/main/ipc/handlers/task-handlers.ts', 'electron')).toBe('main/ipc');
    });

    it('groups electron main/bootstrap', () => {
      expect(getFileGroup('src/main/bootstrap/init.ts', 'electron')).toBe('main/bootstrap');
    });

    it('groups electron shared', () => {
      expect(getFileGroup('src/shared/types.ts', 'electron')).toBe('shared');
    });

    it('groups electron preload', () => {
      expect(getFileGroup('src/preload/index.ts', 'electron')).toBe('preload');
    });

    it('groups electron renderer subdir', () => {
      expect(getFileGroup('src/renderer/shared/components/Button.tsx', 'electron')).toBe('renderer/shared');
    });

    it('groups electron main root', () => {
      expect(getFileGroup('src/main/index.ts', 'electron')).toBe('main');
    });

    it('uses top-level directory as group for non-electron', () => {
      expect(getFileGroup('src/components/Button.tsx', 'nextjs')).toBe('src');
    });

    it('returns other for root-level files', () => {
      expect(getFileGroup('index.ts', 'unknown')).toBe('other');
    });

    it('normalizes backslashes', () => {
      expect(getFileGroup('src\\main\\ipc\\handlers.ts', 'electron')).toBe('main/ipc');
    });
  });

  // ── buildCodebaseGraph() ──────────────────────────────────────

  describe('buildCodebaseGraph()', () => {
    it('returns empty graph for empty project', () => {
      const vol = getMockVol();
      vol.mkdirSync('/project/src', { recursive: true });
      resetFs({
        '/project/package.json': JSON.stringify({ dependencies: {} }),
      });
      // Need to recreate src dir since resetFs resets vol
      getMockVol().mkdirSync('/project/src', { recursive: true });

      const graph = buildCodebaseGraph('/project');
      expect(graph.files).toEqual([]);
      expect(graph.edges).toEqual([]);
      expect(graph.groups).toEqual([]);
      expect(graph.projectPath).toBe('/project');
    });

    it('collects files and detects framework', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          dependencies: { electron: '^29.0.0' },
        }),
        '/project/src/main/index.ts': 'console.log("main");',
        '/project/src/shared/types.ts': 'export type X = string;',
      });

      const graph = buildCodebaseGraph('/project');
      expect(graph.framework).toBe('electron');
      expect(graph.files).toHaveLength(2);
      expect(graph.files.map((f) => f.relativePath).sort()).toEqual([
        'src/main/index.ts',
        'src/shared/types.ts',
      ]);
    });

    it('builds edges from resolved imports', () => {
      resetFs({
        '/project/package.json': JSON.stringify({}),
        '/project/src/a.ts': 'import { b } from "./b";',
        '/project/src/b.ts': 'export const b = 1;',
      });

      const graph = buildCodebaseGraph('/project');
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]).toEqual({
        source: '/project/src/a.ts',
        target: '/project/src/b.ts',
      });
    });

    it('tracks import counts', () => {
      resetFs({
        '/project/package.json': JSON.stringify({}),
        '/project/src/a.ts': 'import { shared } from "./shared";',
        '/project/src/b.ts': 'import { shared } from "./shared";',
        '/project/src/shared.ts': 'export const shared = 1;',
      });

      const graph = buildCodebaseGraph('/project');
      const sharedFile = graph.files.find((f) => f.fileName === 'shared.ts');
      expect(sharedFile?.importCount).toBe(2);
    });

    it('does not create self-edges', () => {
      resetFs({
        '/project/package.json': JSON.stringify({}),
        '/project/src/a.ts': 'import { a } from "./a";',
      });

      const graph = buildCodebaseGraph('/project');
      expect(graph.edges).toHaveLength(0);
    });

    it('assigns groups based on framework', () => {
      resetFs({
        '/project/package.json': JSON.stringify({
          dependencies: { electron: '^29.0.0' },
        }),
        '/project/src/main/services/foo/bar.ts': 'export const bar = 1;',
        '/project/src/shared/types.ts': 'export type X = string;',
      });

      const graph = buildCodebaseGraph('/project');
      expect(graph.groups).toContain('main/services/foo');
      expect(graph.groups).toContain('shared');
    });

    it('includes buildTimeMs', () => {
      resetFs({
        '/project/package.json': JSON.stringify({}),
        '/project/src/a.ts': 'const x = 1;',
      });

      const graph = buildCodebaseGraph('/project');
      expect(typeof graph.buildTimeMs).toBe('number');
      expect(graph.buildTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('falls back to project root when no src/ directory', () => {
      resetFs({
        '/project/package.json': JSON.stringify({}),
        '/project/app.ts': 'const x = 1;',
      });

      const graph = buildCodebaseGraph('/project');
      expect(graph.files).toHaveLength(1);
      expect(graph.files[0].fileName).toBe('app.ts');
    });

    it('ignores external package imports', () => {
      resetFs({
        '/project/package.json': JSON.stringify({}),
        '/project/src/a.ts': 'import React from "react";\nimport { b } from "./b";',
        '/project/src/b.ts': 'export const b = 1;',
      });

      const graph = buildCodebaseGraph('/project');
      // Only one edge (a->b), not an edge to react
      expect(graph.edges).toHaveLength(1);
    });
  });
});
