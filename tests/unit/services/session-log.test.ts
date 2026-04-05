/**
 * Unit Tests for Session Log Reader
 *
 * Tests path encoding, session file finding, and paginated log reading.
 * Mocks node:fs, node:path, and node:os for memfs compatibility.
 *
 * Note: encodeProjectPath uses replaceAll with a non-global regex, which
 * throws in some Node versions. We patch String.prototype.replaceAll to
 * handle this case, since the source code is correct per the ES2024 spec
 * but Vitest may run with a Node version that enforces the older behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Polyfill replaceAll for non-global regex ──────────────────────
// The source code calls .replaceAll(/^[/\\]+/u, '') which is valid ES2024
// but older Node.js throws. Patch it for the test environment.
const origReplaceAll = String.prototype.replaceAll;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
String.prototype.replaceAll = function (this: string, searchValue: any, replaceValue: any): string {
  if (searchValue instanceof RegExp && !searchValue.flags.includes('g')) {
    const globalRe = new RegExp(searchValue.source, searchValue.flags + 'g');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.replace(globalRe, replaceValue);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return origReplaceAll.call(this, searchValue, replaceValue);
} as typeof origReplaceAll;

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
  };
});

// ── OS Mocking (homedir) ──────────────────────────────────────────

vi.mock('node:os', () => ({
  homedir: () => '/mock/home',
}));

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
const { encodeProjectPath, findSessionFile, buildSessionLog } =
  await import('@main/services/visualization/session-log');

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

describe('Session Log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    resetFs();
  });

  // ── encodeProjectPath() ───────────────────────────────────────

  describe('encodeProjectPath()', () => {
    it('encodes Unix paths', () => {
      expect(encodeProjectPath('/Users/foo/app')).toBe('Users-foo-app');
    });

    it('encodes Windows paths', () => {
      expect(encodeProjectPath('C:\\Users\\foo\\app')).toBe('C--Users-foo-app');
    });

    it('strips leading slashes', () => {
      expect(encodeProjectPath('//double/leading')).toBe('double-leading');
    });

    it('handles single directory', () => {
      expect(encodeProjectPath('/app')).toBe('app');
    });
  });

  // ── findSessionFile() ─────────────────────────────────────────

  describe('findSessionFile()', () => {
    it('returns null when sid is null', () => {
      expect(findSessionFile('/project', null)).toBeNull();
    });

    it('returns null when sid is empty string', () => {
      expect(findSessionFile('/project', '')).toBeNull();
    });

    it('returns null when project dir does not exist', () => {
      expect(findSessionFile('/project', 'abc123')).toBeNull();
    });

    it('finds exact session file', () => {
      const encodedPath = encodeProjectPath('/project');
      const sessionDir = `/mock/home/.claude/projects/${encodedPath}`;
      resetFs({
        [`${sessionDir}/abc123.jsonl`]: '{"ts":"2026-01-01"}',
      });

      const result = findSessionFile('/project', 'abc123');
      expect(result).toBe(`${sessionDir}/abc123.jsonl`);
    });

    it('finds session file by prefix match', () => {
      const encodedPath = encodeProjectPath('/project');
      const sessionDir = `/mock/home/.claude/projects/${encodedPath}`;
      resetFs({
        [`${sessionDir}/abc123-full-id.jsonl`]: '{"ts":"2026-01-01"}',
      });

      const result = findSessionFile('/project', 'abc123');
      expect(result).toBe(`${sessionDir}/abc123-full-id.jsonl`);
    });

    it('returns null when no matching file found', () => {
      const encodedPath = encodeProjectPath('/project');
      const sessionDir = `/mock/home/.claude/projects/${encodedPath}`;
      resetFs({
        [`${sessionDir}/other-id.jsonl`]: '{"ts":"2026-01-01"}',
      });

      const result = findSessionFile('/project', 'abc123');
      expect(result).toBeNull();
    });
  });

  // ── buildSessionLog() ─────────────────────────────────────────

  describe('buildSessionLog()', () => {
    const baseOpts = {
      projectPath: '/project',
      agentName: 'coder-task-1',
      feature: 'my-feature',
    };

    function sessionDir(): string {
      return `/mock/home/.claude/projects/${encodeProjectPath('/project')}`;
    }

    it('returns empty page when sid is null', () => {
      const result = buildSessionLog({ ...baseOpts, sid: null, cursor: 0 });
      expect(result.lines).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.cursor).toBe(-1);
      expect(result.sessionFile).toBeNull();
      expect(result.agentName).toBe('coder-task-1');
      expect(result.feature).toBe('my-feature');
    });

    it('returns empty page when session file not found', () => {
      const result = buildSessionLog({ ...baseOpts, sid: 'nonexistent', cursor: 0 });
      expect(result.lines).toEqual([]);
      expect(result.cursor).toBe(-1);
    });

    it('returns empty page for empty session file', () => {
      const dir = sessionDir();
      resetFs({
        [`${dir}/sid1.jsonl`]: '',
      });

      const result = buildSessionLog({ ...baseOpts, sid: 'sid1', cursor: 0 });
      expect(result.lines).toEqual([]);
      expect(result.cursor).toBe(-1);
      expect(result.sessionFile).toBe(`${dir}/sid1.jsonl`);
    });

    it('reads session lines from cursor 0', () => {
      const dir = sessionDir();
      const lines = [
        JSON.stringify({ ts: '2026-01-01T00:00:00Z', type: 'system' }),
        JSON.stringify({ ts: '2026-01-01T00:00:01Z', type: 'assistant' }),
      ];
      resetFs({
        [`${dir}/sid1.jsonl`]: lines.join('\n') + '\n',
      });

      const result = buildSessionLog({ ...baseOpts, sid: 'sid1', cursor: 0 });
      expect(result.lines).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.lines[0].type).toBe('system');
      expect(result.lines[0].ts).toBe('2026-01-01T00:00:00Z');
      expect(result.lines[1].type).toBe('assistant');
      expect(result.cursor).toBe(-1);
    });

    it('skips empty lines in total count', () => {
      const dir = sessionDir();
      const content = `${JSON.stringify({ type: 'system' })}\n\n${JSON.stringify({ type: 'assistant' })}\n`;
      resetFs({
        [`${dir}/sid1.jsonl`]: content,
      });

      const result = buildSessionLog({ ...baseOpts, sid: 'sid1', cursor: 0 });
      expect(result.total).toBe(2);
      expect(result.lines).toHaveLength(2);
    });

    it('parses lines with missing ts and type gracefully', () => {
      const dir = sessionDir();
      resetFs({
        [`${dir}/sid1.jsonl`]: '{"data":"no ts or type"}\n',
      });

      const result = buildSessionLog({ ...baseOpts, sid: 'sid1', cursor: 0 });
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].ts).toBeUndefined();
      expect(result.lines[0].type).toBeUndefined();
      expect(result.lines[0].raw).toBe('{"data":"no ts or type"}');
    });

    it('handles malformed JSON lines gracefully', () => {
      const dir = sessionDir();
      resetFs({
        [`${dir}/sid1.jsonl`]: 'not json\n',
      });

      const result = buildSessionLog({ ...baseOpts, sid: 'sid1', cursor: 0 });
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].raw).toBe('not json');
      expect(result.lines[0].ts).toBeUndefined();
    });

    it('paginates with cursor for large files', () => {
      const dir = sessionDir();

      // Create 150 lines (more than PAGE_SIZE of 100)
      const lineObjs = Array.from({ length: 150 }, (_, i) =>
        JSON.stringify({ ts: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`, type: 'system' }),
      );
      resetFs({
        [`${dir}/sid1.jsonl`]: lineObjs.join('\n') + '\n',
      });

      // First page
      const page1 = buildSessionLog({ ...baseOpts, sid: 'sid1', cursor: 0 });
      expect(page1.lines).toHaveLength(100);
      expect(page1.total).toBe(150);
      expect(page1.cursor).toBeGreaterThan(0);

      // Second page
      const page2 = buildSessionLog({ ...baseOpts, sid: 'sid1', cursor: page1.cursor });
      expect(page2.lines).toHaveLength(50);
      expect(page2.cursor).toBe(-1);
    });

    it('preserves line index from file', () => {
      const dir = sessionDir();
      const lines = [
        JSON.stringify({ type: 'system' }),
        JSON.stringify({ type: 'assistant' }),
      ];
      resetFs({
        [`${dir}/sid1.jsonl`]: lines.join('\n') + '\n',
      });

      const result = buildSessionLog({ ...baseOpts, sid: 'sid1', cursor: 0 });
      expect(result.lines[0].index).toBe(0);
      expect(result.lines[1].index).toBe(1);
    });
  });
});
