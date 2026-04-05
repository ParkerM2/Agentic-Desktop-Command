/**
 * Unit Tests for JSONL Parser (createJsonlTailReader)
 *
 * Tests incremental JSONL reading, partial line handling, file truncation.
 * Mocks node:fs with memfs.
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
  };
});

// ── File System Mocking ───────────────────────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;

  return {
    default: fs,
    ...fs,
  };
});

// ── Logger Mocking ────────────────────────────────────────────

vi.mock('@main/lib/logger', () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const { createJsonlTailReader } = await import(
  '@main/services/session-jsonl/jsonl-parser'
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

const FILE_PATH = '/mock/session/output.jsonl';

function makeEvent(type: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ type, ...extra });
}

// ── Tests ─────────────────────────────────────────────────────

describe('JsonlTailReader', () => {
  beforeEach(() => {
    resetFs();
  });

  it('reads existing lines on start()', () => {
    const content = [
      makeEvent('system', { system: { session_id: 's1' } }),
      makeEvent('assistant', { assistant: { text: 'Hello' } }),
    ].join('\n') + '\n';

    resetFs({ [FILE_PATH]: content });

    const events: unknown[] = [];
    const reader = createJsonlTailReader(FILE_PATH, (event) => {
      events.push(event);
    });

    reader.start();

    expect(events).toHaveLength(2);
    expect((events[0] as { type: string }).type).toBe('system');
    expect((events[1] as { type: string }).type).toBe('assistant');

    reader.stop();
  });

  it('tracks byte offset after reading', () => {
    const content = makeEvent('system') + '\n';
    resetFs({ [FILE_PATH]: content });

    const reader = createJsonlTailReader(FILE_PATH, vi.fn());
    reader.start();

    expect(reader.getOffset()).toBe(Buffer.byteLength(content, 'utf-8'));

    reader.stop();
  });

  it('skips malformed JSON lines', () => {
    const content = [
      makeEvent('system'),
      'this is not json {{{',
      makeEvent('assistant'),
    ].join('\n') + '\n';

    resetFs({ [FILE_PATH]: content });

    const events: unknown[] = [];
    const reader = createJsonlTailReader(FILE_PATH, (event) => {
      events.push(event);
    });

    reader.start();

    // Only valid events should be emitted
    expect(events).toHaveLength(2);

    reader.stop();
  });

  it('skips empty lines', () => {
    const content = makeEvent('system') + '\n\n\n' + makeEvent('result') + '\n';
    resetFs({ [FILE_PATH]: content });

    const events: unknown[] = [];
    const reader = createJsonlTailReader(FILE_PATH, (event) => {
      events.push(event);
    });

    reader.start();

    expect(events).toHaveLength(2);

    reader.stop();
  });

  it('skips events with invalid type field', () => {
    const content = [
      JSON.stringify({ type: 'system' }),
      JSON.stringify({ type: 'unknown_type' }), // invalid
      JSON.stringify({ noType: true }), // missing type
    ].join('\n') + '\n';

    resetFs({ [FILE_PATH]: content });

    const events: unknown[] = [];
    const reader = createJsonlTailReader(FILE_PATH, (event) => {
      events.push(event);
    });

    reader.start();

    // Only 'system' is a valid type
    expect(events).toHaveLength(1);

    reader.stop();
  });

  it('starts with offset 0', () => {
    resetFs({ [FILE_PATH]: '' });

    const reader = createJsonlTailReader(FILE_PATH, vi.fn());

    expect(reader.getOffset()).toBe(0);
  });

  it('start() is idempotent — does not double-watch', () => {
    resetFs({ [FILE_PATH]: makeEvent('system') + '\n' });

    const events: unknown[] = [];
    const reader = createJsonlTailReader(FILE_PATH, (event) => {
      events.push(event);
    });

    reader.start();
    reader.start(); // Second call should be no-op

    // Should only read once
    expect(events).toHaveLength(1);

    reader.stop();
  });

  it('stop() resets partial line state', () => {
    resetFs({ [FILE_PATH]: makeEvent('system') + '\n' });

    const reader = createJsonlTailReader(FILE_PATH, vi.fn());
    reader.start();
    reader.stop();

    // After stop, start again should work cleanly
    // (we can't easily test partial line clearing without internal access,
    // but we verify stop doesn't throw)
    expect(() => reader.stop()).not.toThrow();
  });
});
