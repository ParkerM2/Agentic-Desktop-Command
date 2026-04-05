/**
 * Unit Tests for Stream JSON Parser
 *
 * Tests NDJSON parsing, buffering of incomplete lines,
 * event/message/error handler registration, and reset.
 * No file system mocking needed — pure in-memory logic.
 */

import { describe, expect, it, vi } from 'vitest';

import { createStreamJsonParser, extractToolCalls } from '@main/services/agent-manager/stream-json-parser';

import type { ContentBlock, StreamJsonEvent } from '@shared/types/agent-dashboard';

// ── Tests ───────────────────────────────────────────────────────────

describe('StreamJsonParser', () => {
  // ── extractToolCalls() ──────────────────────────────────────────

  describe('extractToolCalls()', () => {
    it('returns only tool_use blocks', () => {
      const blocks: ContentBlock[] = [
        { type: 'text', text: 'hello' },
        { type: 'tool_use', id: 't1', name: 'bash', input: {} },
        { type: 'text', text: 'world' },
        { type: 'tool_use', id: 't2', name: 'read', input: {} },
      ];
      const result = extractToolCalls(blocks);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'tool_use', id: 't1', name: 'bash', input: {} });
      expect(result[1]).toEqual({ type: 'tool_use', id: 't2', name: 'read', input: {} });
    });

    it('returns empty array when no tool_use blocks', () => {
      const blocks: ContentBlock[] = [
        { type: 'text', text: 'hello' },
      ];
      expect(extractToolCalls(blocks)).toEqual([]);
    });

    it('returns empty array for empty content', () => {
      expect(extractToolCalls([])).toEqual([]);
    });
  });

  // ── createStreamJsonParser() ────────────────────────────────────

  describe('createStreamJsonParser()', () => {
    it('parses a complete NDJSON line and emits event', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      parser.onEvent(handler);

      const event: StreamJsonEvent = { type: 'system' };
      parser.feed(JSON.stringify(event) + '\n');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'system' }));
    });

    it('buffers incomplete lines until newline arrives', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      parser.onEvent(handler);

      const json = JSON.stringify({ type: 'system' });
      // Send first half without newline
      parser.feed(json.slice(0, 5));
      expect(handler).not.toHaveBeenCalled();

      // Send rest with newline
      parser.feed(json.slice(5) + '\n');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('handles multiple lines in a single chunk', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      parser.onEvent(handler);

      const line1 = JSON.stringify({ type: 'system' });
      const line2 = JSON.stringify({ type: 'result' });
      parser.feed(line1 + '\n' + line2 + '\n');

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('emits chat message for assistant events', () => {
      const parser = createStreamJsonParser('agent-1');
      const msgHandler = vi.fn();
      parser.onMessage(msgHandler);

      const event = {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Hello!' }],
        },
      };
      parser.feed(JSON.stringify(event) + '\n');

      expect(msgHandler).toHaveBeenCalledTimes(1);
      expect(msgHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello!' }],
        }),
      );
    });

    it('does not emit chat message for non-assistant events', () => {
      const parser = createStreamJsonParser('agent-1');
      const msgHandler = vi.fn();
      parser.onMessage(msgHandler);

      parser.feed(JSON.stringify({ type: 'system' }) + '\n');
      parser.feed(JSON.stringify({ type: 'result' }) + '\n');

      expect(msgHandler).not.toHaveBeenCalled();
    });

    it('increments message counter for each assistant message', () => {
      const parser = createStreamJsonParser('agent-1');
      const msgHandler = vi.fn();
      parser.onMessage(msgHandler);

      const event = {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'msg' }] },
      };
      parser.feed(JSON.stringify(event) + '\n');
      parser.feed(JSON.stringify(event) + '\n');

      expect(msgHandler).toHaveBeenCalledTimes(2);
      expect(msgHandler.mock.calls[0][0].id).toBe('agent-1-msg-1');
      expect(msgHandler.mock.calls[1][0].id).toBe('agent-1-msg-2');
    });

    it('emits error for malformed JSON', () => {
      const parser = createStreamJsonParser('agent-1');
      const errorHandler = vi.fn();
      parser.onError(errorHandler);

      parser.feed('not valid json\n');

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(errorHandler.mock.calls[0][1]).toBe('not valid json');
    });

    it('emits error for valid JSON with invalid type', () => {
      const parser = createStreamJsonParser('agent-1');
      const errorHandler = vi.fn();
      parser.onError(errorHandler);

      parser.feed(JSON.stringify({ type: 'unknown_type' }) + '\n');

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].message).toContain('Invalid stream-json event');
    });

    it('emits error for JSON without type field', () => {
      const parser = createStreamJsonParser('agent-1');
      const errorHandler = vi.fn();
      parser.onError(errorHandler);

      parser.feed(JSON.stringify({ data: 'no type' }) + '\n');

      expect(errorHandler).toHaveBeenCalledTimes(1);
    });

    it('skips empty lines', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      const errorHandler = vi.fn();
      parser.onEvent(handler);
      parser.onError(errorHandler);

      parser.feed('\n\n\n');

      expect(handler).not.toHaveBeenCalled();
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('handles Buffer input', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      parser.onEvent(handler);

      const buf = Buffer.from(JSON.stringify({ type: 'system' }) + '\n', 'utf-8');
      parser.feed(buf);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe removes handler', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      const unsub = parser.onEvent(handler);

      parser.feed(JSON.stringify({ type: 'system' }) + '\n');
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      parser.feed(JSON.stringify({ type: 'system' }) + '\n');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('reset clears buffer and message counter', () => {
      const parser = createStreamJsonParser('agent-1');
      const msgHandler = vi.fn();
      parser.onMessage(msgHandler);

      const event = {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'msg' }] },
      };
      parser.feed(JSON.stringify(event) + '\n');
      expect(msgHandler.mock.calls[0][0].id).toBe('agent-1-msg-1');

      parser.reset();

      // Feed incomplete data before reset to test buffer clearing
      parser.feed(JSON.stringify(event) + '\n');
      expect(msgHandler.mock.calls[1][0].id).toBe('agent-1-msg-1');
    });

    it('reset clears partial buffer', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      const errorHandler = vi.fn();
      parser.onEvent(handler);
      parser.onError(errorHandler);

      // Feed partial line
      parser.feed('{"type":"sys');
      parser.reset();

      // Feed new complete line — should not include old buffer
      parser.feed(JSON.stringify({ type: 'system' }) + '\n');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('onMessage unsubscribe works', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      const unsub = parser.onMessage(handler);

      const event = {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'msg' }] },
      };
      parser.feed(JSON.stringify(event) + '\n');
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      parser.feed(JSON.stringify(event) + '\n');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('onError unsubscribe works', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      const unsub = parser.onError(handler);

      parser.feed('bad json\n');
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      parser.feed('more bad json\n');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not emit message for assistant without message field', () => {
      const parser = createStreamJsonParser('agent-1');
      const msgHandler = vi.fn();
      parser.onMessage(msgHandler);

      // assistant event without message property
      parser.feed(JSON.stringify({ type: 'assistant' }) + '\n');
      expect(msgHandler).not.toHaveBeenCalled();
    });

    it('handles stream_event type', () => {
      const parser = createStreamJsonParser('agent-1');
      const handler = vi.fn();
      parser.onEvent(handler);

      parser.feed(JSON.stringify({ type: 'stream_event', event_type: 'content_block_delta' }) + '\n');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'stream_event' }),
      );
    });
  });
});
