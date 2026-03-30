/**
 * JSONL Parser — Tail-follow a JSONL file and parse new lines
 *
 * Tracks file offset to only read newly appended content.
 * Uses fs.watch for change detection and fs.read with offset tracking
 * for efficient incremental reads.
 *
 * Handles:
 *   - Incomplete writes (partial JSON at end of file)
 *   - File truncation (offset reset)
 *   - Rapid appends (buffer accumulation for split lines)
 */

import { closeSync, openSync, readSync, statSync, watch } from 'node:fs';

import type { StreamJsonEvent } from '@shared/types/agent-dashboard';

import { appLogger } from '../../lib/logger';

const READ_BUFFER_SIZE = 64 * 1024; // 64 KB per read

export type JsonlEventHandler = (event: StreamJsonEvent) => void;

export interface JsonlTailReader {
  /** Start tailing the file. Emits events for each new JSONL line. */
  start: () => void;
  /** Stop tailing and release resources. */
  stop: () => void;
  /** Get the current byte offset in the file. */
  getOffset: () => number;
}

/**
 * Create a tail reader for a JSONL file.
 * Watches for changes and reads new lines from the last known offset.
 */
export function createJsonlTailReader(
  filePath: string,
  onEvent: JsonlEventHandler,
): JsonlTailReader {
  let offset = 0;
  let watcher: ReturnType<typeof watch> | null = null;
  let partialLine = '';
  let isReading = false;

  function readNewContent(): void {
    if (isReading) {
      return;
    }
    isReading = true;

    try {
      const stats = statSync(filePath);
      const fileSize = stats.size;

      // Handle file truncation (file was recreated or truncated)
      if (fileSize < offset) {
        appLogger.info(`[JsonlParser] File truncated, resetting offset: ${filePath}`);
        offset = 0;
        partialLine = '';
      }

      // Nothing new to read
      if (fileSize <= offset) {
        return;
      }

      const bytesToRead = fileSize - offset;
      const buffer = Buffer.alloc(Math.min(bytesToRead, READ_BUFFER_SIZE));
      const fd = openSync(filePath, 'r');

      try {
        let totalRead = 0;
        while (totalRead < bytesToRead) {
          const chunkSize = Math.min(bytesToRead - totalRead, READ_BUFFER_SIZE);
          const readBuffer = chunkSize === buffer.length ? buffer : Buffer.alloc(chunkSize);
          const bytesRead = readSync(fd, readBuffer, 0, chunkSize, offset + totalRead);

          if (bytesRead === 0) {
            break;
          }

          totalRead += bytesRead;
          const chunk = readBuffer.subarray(0, bytesRead).toString('utf-8');
          processChunk(chunk);
        }

        offset += totalRead;
      } finally {
        closeSync(fd);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      appLogger.warn(`[JsonlParser] Error reading ${filePath}: ${msg}`);
    } finally {
      isReading = false;
    }
  }

  function processChunk(chunk: string): void {
    const text = partialLine + chunk;
    const lines = text.split('\n');

    // Last element is either empty (if chunk ended with \n) or a partial line
    partialLine = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        continue;
      }

      try {
        const event = JSON.parse(trimmed) as StreamJsonEvent;
        if (isValidStreamJsonEvent(event)) {
          onEvent(event);
        }
      } catch {
        // Incomplete or malformed JSON line — skip silently
        // This can happen with partial writes; the next read will pick up the rest
      }
    }
  }

  return {
    start(): void {
      if (watcher !== null) {
        return;
      }

      // Do an initial read to catch up
      readNewContent();

      try {
        watcher = watch(filePath, () => {
          readNewContent();
        });

        watcher.on('error', (error) => {
          appLogger.warn(`[JsonlParser] Watcher error for ${filePath}: ${error.message}`);
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        appLogger.warn(`[JsonlParser] Failed to watch ${filePath}: ${msg}`);
      }
    },

    stop(): void {
      if (watcher !== null) {
        watcher.close();
        watcher = null;
      }
      partialLine = '';
    },

    getOffset(): number {
      return offset;
    },
  };
}

/** Validate that a parsed object looks like a StreamJsonEvent */
function isValidStreamJsonEvent(obj: unknown): obj is StreamJsonEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const candidate = obj as Record<string, unknown>;
  const validTypes = new Set(['system', 'assistant', 'stream_event', 'result']);
  return typeof candidate.type === 'string' && validTypes.has(candidate.type);
}
