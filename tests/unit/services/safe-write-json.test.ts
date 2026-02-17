/**
 * Unit Tests for safeWriteJson
 *
 * Tests the atomic write pattern: write to .tmp, fsync, rename.
 * Mocks all node:fs functions to verify the correct sequence of operations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock node:fs ────────────────────────────────────────────────────

const mockOpenSync = vi.fn();
const mockWriteSync = vi.fn();
const mockFsyncSync = vi.fn();
const mockCloseSync = vi.fn();
const mockRenameSync = vi.fn();

vi.mock('node:fs', () => ({
  openSync: mockOpenSync,
  writeSync: mockWriteSync,
  fsyncSync: mockFsyncSync,
  closeSync: mockCloseSync,
  renameSync: mockRenameSync,
}));

// Import after mocks
const { safeWriteJson } = await import('@main/lib/safe-write-json');

// ── Tests ───────────────────────────────────────────────────────────

describe('safeWriteJson', () => {
  const FILE_PATH = '/mock/data/test.json';
  const TMP_PATH = `${FILE_PATH}.tmp`;
  const MOCK_FD = 42;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock implementations to default (no-op) before each test
    mockOpenSync.mockReset();
    mockWriteSync.mockReset();
    mockFsyncSync.mockReset();
    mockCloseSync.mockReset();
    mockRenameSync.mockReset();
    mockOpenSync.mockReturnValue(MOCK_FD);
  });

  // ── Happy path ──────────────────────────────────────────────────

  describe('happy path', () => {
    it('writes to .tmp file, fsyncs, then renames to target', () => {
      const data = { key: 'value', nested: { arr: [1, 2, 3] } };

      safeWriteJson(FILE_PATH, data);

      // 1. Open tmp file for writing
      expect(mockOpenSync).toHaveBeenCalledWith(TMP_PATH, 'w');

      // 2. Write serialized JSON
      const expectedJson = JSON.stringify(data, null, 2);
      expect(mockWriteSync).toHaveBeenCalledWith(MOCK_FD, expectedJson, null, 'utf-8');

      // 3. Flush to disk
      expect(mockFsyncSync).toHaveBeenCalledWith(MOCK_FD);

      // 4. Close file descriptor
      expect(mockCloseSync).toHaveBeenCalledWith(MOCK_FD);

      // 5. Atomic rename
      expect(mockRenameSync).toHaveBeenCalledWith(TMP_PATH, FILE_PATH);
    });

    it('calls operations in correct order', () => {
      const callOrder: string[] = [];
      mockOpenSync.mockImplementation(() => {
        callOrder.push('open');
        return MOCK_FD;
      });
      mockWriteSync.mockImplementation(() => {
        callOrder.push('write');
      });
      mockFsyncSync.mockImplementation(() => {
        callOrder.push('fsync');
      });
      mockCloseSync.mockImplementation(() => {
        callOrder.push('close');
      });
      mockRenameSync.mockImplementation(() => {
        callOrder.push('rename');
      });

      safeWriteJson(FILE_PATH, { test: true });

      expect(callOrder).toEqual(['open', 'write', 'fsync', 'close', 'rename']);
    });

    it('pretty-prints JSON with 2-space indentation', () => {
      const data = [1, 2, 3];

      safeWriteJson(FILE_PATH, data);

      const writtenJson = mockWriteSync.mock.calls[0]?.[1] as string;
      expect(writtenJson).toBe(JSON.stringify(data, null, 2));
      expect(writtenJson).toContain('\n');
    });
  });

  // ── Error handling ──────────────────────────────────────────────

  describe('error handling', () => {
    it('closes file descriptor even if writeSync fails', () => {
      mockWriteSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => safeWriteJson(FILE_PATH, { data: true })).toThrow('Disk full');

      // closeSync should still be called in finally block
      expect(mockCloseSync).toHaveBeenCalledWith(MOCK_FD);

      // renameSync should NOT be called since write failed
      expect(mockRenameSync).not.toHaveBeenCalled();
    });

    it('closes file descriptor even if fsyncSync fails', () => {
      mockFsyncSync.mockImplementation(() => {
        throw new Error('fsync failed');
      });

      expect(() => safeWriteJson(FILE_PATH, { data: true })).toThrow('fsync failed');

      // closeSync should still be called in finally block
      expect(mockCloseSync).toHaveBeenCalledWith(MOCK_FD);

      // renameSync should NOT be called since fsync failed
      expect(mockRenameSync).not.toHaveBeenCalled();
    });

    it('propagates openSync errors without calling other operations', () => {
      mockOpenSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => safeWriteJson(FILE_PATH, { data: true })).toThrow('Permission denied');

      expect(mockWriteSync).not.toHaveBeenCalled();
      expect(mockFsyncSync).not.toHaveBeenCalled();
      // closeSync is in finally, but fd was never assigned — still called with undefined
      // Actually, since openSync throws before fd assignment, the try block body never executes
      // but finally runs and closeSync is called. Let's verify rename is not called.
      expect(mockRenameSync).not.toHaveBeenCalled();
    });
  });

  // ── Serialization ───────────────────────────────────────────────

  describe('serialization', () => {
    it('handles arrays', () => {
      safeWriteJson(FILE_PATH, [1, 'two', { three: 3 }]);

      const writtenJson = mockWriteSync.mock.calls[0]?.[1] as string;
      expect(JSON.parse(writtenJson)).toEqual([1, 'two', { three: 3 }]);
    });

    it('handles empty objects', () => {
      safeWriteJson(FILE_PATH, {});

      const writtenJson = mockWriteSync.mock.calls[0]?.[1] as string;
      expect(JSON.parse(writtenJson)).toEqual({});
    });

    it('handles null values', () => {
      safeWriteJson(FILE_PATH, null);

      const writtenJson = mockWriteSync.mock.calls[0]?.[1] as string;
      expect(JSON.parse(writtenJson)).toBeNull();
    });
  });
});
