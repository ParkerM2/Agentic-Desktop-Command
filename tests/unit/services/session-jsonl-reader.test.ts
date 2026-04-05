/**
 * Unit Tests for SessionJSONLReaderService
 *
 * Tests startReading, stopReading, isReading, getOffset, onEvent, dispose.
 * Mocks the jsonl-parser module to avoid filesystem access.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────

const mockStart = vi.fn();
const mockStop = vi.fn();
const mockGetOffset = vi.fn().mockReturnValue(0);

let capturedOnEvent: ((event: unknown) => void) | null = null;

vi.mock('@main/services/session-jsonl/jsonl-parser', () => ({
  createJsonlTailReader: vi.fn((_path: string, onEvent: (event: unknown) => void) => {
    capturedOnEvent = onEvent;
    return {
      start: mockStart,
      stop: mockStop,
      getOffset: mockGetOffset,
    };
  }),
}));

vi.mock('@main/lib/logger', () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const { createSessionJSONLReaderService } = await import(
  '@main/services/session-jsonl/session-jsonl-reader'
);

// ── Tests ─────────────────────────────────────────────────────

describe('SessionJSONLReaderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnEvent = null;
  });

  describe('startReading()', () => {
    it('creates and starts a tail reader for the session', () => {
      const service = createSessionJSONLReaderService();
      service.startReading('session-1', '/path/to/session-1.jsonl');

      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it('does not create duplicate readers for the same session', () => {
      const service = createSessionJSONLReaderService();
      service.startReading('session-1', '/path/to/session-1.jsonl');
      service.startReading('session-1', '/path/to/session-1.jsonl');

      // start should only be called once
      expect(mockStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopReading()', () => {
    it('stops and removes the reader', () => {
      const service = createSessionJSONLReaderService();
      service.startReading('session-1', '/path/to/session-1.jsonl');

      service.stopReading('session-1');

      expect(mockStop).toHaveBeenCalledTimes(1);
      expect(service.isReading('session-1')).toBe(false);
    });

    it('is a no-op for unknown session', () => {
      const service = createSessionJSONLReaderService();
      service.stopReading('nonexistent');

      expect(mockStop).not.toHaveBeenCalled();
    });
  });

  describe('isReading()', () => {
    it('returns true for active session', () => {
      const service = createSessionJSONLReaderService();
      service.startReading('session-1', '/path/to/session-1.jsonl');

      expect(service.isReading('session-1')).toBe(true);
    });

    it('returns false for unknown session', () => {
      const service = createSessionJSONLReaderService();

      expect(service.isReading('unknown')).toBe(false);
    });
  });

  describe('getOffset()', () => {
    it('returns the reader offset for active session', () => {
      mockGetOffset.mockReturnValue(1024);

      const service = createSessionJSONLReaderService();
      service.startReading('session-1', '/path/to/session-1.jsonl');

      expect(service.getOffset('session-1')).toBe(1024);
    });

    it('returns 0 for unknown session', () => {
      const service = createSessionJSONLReaderService();

      expect(service.getOffset('unknown')).toBe(0);
    });
  });

  describe('onEvent()', () => {
    it('notifies subscribers when events arrive', () => {
      const service = createSessionJSONLReaderService();
      const handler = vi.fn();
      service.onEvent(handler);

      service.startReading('session-1', '/path/to/session-1.jsonl');

      // Simulate an event from the tail reader
      const event = { type: 'assistant', assistant: { text: 'hello' } };
      capturedOnEvent?.(event);

      expect(handler).toHaveBeenCalledWith('session-1', event);
    });

    it('returns an unsubscribe function', () => {
      const service = createSessionJSONLReaderService();
      const handler = vi.fn();
      const unsub = service.onEvent(handler);

      service.startReading('session-1', '/path/to/session-1.jsonl');

      unsub();

      capturedOnEvent?.({ type: 'system' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    it('stops all readers and clears handlers', () => {
      const service = createSessionJSONLReaderService();
      service.startReading('s1', '/path/s1.jsonl');
      service.startReading('s2', '/path/s2.jsonl');

      service.dispose();

      expect(mockStop).toHaveBeenCalledTimes(2);
      expect(service.isReading('s1')).toBe(false);
      expect(service.isReading('s2')).toBe(false);
    });
  });
});
