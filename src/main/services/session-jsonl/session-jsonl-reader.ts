/**
 * SessionJSONLReader Service — Tail-follow session JSONL files for agent output
 *
 * Manages multiple concurrent JSONL tail readers, one per agent session.
 * Each reader watches a session JSONL file at ~/.claude/projects/<cwd>/<sessionId>.jsonl
 * and emits parsed StreamJsonEvent objects via registered handlers.
 *
 * Layer 1 — Agent Visibility: independent of workflow tracking.
 */

import type { StreamJsonEvent } from '@shared/types/agent-dashboard';

import { appLogger } from '../../lib/logger';

import { createJsonlTailReader } from './jsonl-parser';

import type { JsonlTailReader } from './jsonl-parser';

export type SessionEventHandler = (sessionId: string, event: StreamJsonEvent) => void;

export interface SessionJSONLReaderService {
  /** Start reading a session's JSONL file */
  startReading: (sessionId: string, jsonlPath: string) => void;
  /** Stop reading a session's JSONL file */
  stopReading: (sessionId: string) => void;
  /** Check if currently reading a session */
  isReading: (sessionId: string) => boolean;
  /** Get the current byte offset for a session's reader */
  getOffset: (sessionId: string) => number;
  /** Subscribe to events from any session. Returns unsubscribe function. */
  onEvent: (handler: SessionEventHandler) => () => void;
  /** Stop all readers and clean up */
  dispose: () => void;
}

export function createSessionJSONLReaderService(): SessionJSONLReaderService {
  const readers = new Map<string, JsonlTailReader>();
  const eventHandlers = new Set<SessionEventHandler>();

  function emitEvent(sessionId: string, event: StreamJsonEvent): void {
    for (const handler of eventHandlers) {
      handler(sessionId, event);
    }
  }

  return {
    startReading(sessionId: string, jsonlPath: string): void {
      if (readers.has(sessionId)) {
        appLogger.warn(
          `[SessionJSONLReader] Already reading session "${sessionId}". Call stopReading first.`,
        );
        return;
      }

      const reader = createJsonlTailReader(jsonlPath, (event) => {
        emitEvent(sessionId, event);
      });

      readers.set(sessionId, reader);
      reader.start();

      appLogger.info(
        `[SessionJSONLReader] Started reading session "${sessionId}" from: ${jsonlPath}`,
      );
    },

    stopReading(sessionId: string): void {
      const reader = readers.get(sessionId);
      if (reader === undefined) {
        return;
      }

      reader.stop();
      readers.delete(sessionId);
      appLogger.info(`[SessionJSONLReader] Stopped reading session "${sessionId}"`);
    },

    isReading(sessionId: string): boolean {
      return readers.has(sessionId);
    },

    getOffset(sessionId: string): number {
      const reader = readers.get(sessionId);
      if (reader === undefined) {
        return 0;
      }
      return reader.getOffset();
    },

    onEvent(handler: SessionEventHandler): () => void {
      eventHandlers.add(handler);
      return () => {
        eventHandlers.delete(handler);
      };
    },

    dispose(): void {
      for (const [sessionId, reader] of readers.entries()) {
        reader.stop();
        appLogger.info(`[SessionJSONLReader] Disposed reader for session "${sessionId}"`);
      }
      readers.clear();
      eventHandlers.clear();
    },
  };
}
