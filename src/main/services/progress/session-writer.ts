/**
 * Session Writer
 *
 * Filtered JSONL append writer and summary file manager for agent sessions.
 * Receives raw stream-json events, applies filtering/truncation rules, and
 * persists them as newline-delimited JSON to `<agentName>.jsonl`. Maintains
 * a companion `<agentName>.summary.json` that is overwritten on each update.
 *
 * Factory: `createSessionWriter(sessionDir, agentName)` → `SessionWriter`
 */

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FilteredLogEntry, FilteredLogEntryType, SessionSummary } from '@shared/types/progress';

// ─── Types ───────────────────────────────────────────────────

/** Raw stream event from an agent session (loosely typed). */
type StreamEvent = Record<string, unknown>;

export interface SessionWriter {
  appendEvent: (event: StreamEvent) => void;
  updateSummary: (partial: Partial<SessionSummary>) => void;
  finalize: (exitCode: number | null) => void;
}

// ─── Constants ───────────────────────────────────────────────

const TOOL_INPUT_MAX_LENGTH = 500;
const TOOL_OUTPUT_MAX_LENGTH = 200;

// ─── Helpers ─────────────────────────────────────────────────

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}…`;
}

function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return `${value}`;
  return JSON.stringify(value);
}

function safeNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  return 0;
}

// ─── Event Classification & Filtering ────────────────────────

function classifyEvent(event: StreamEvent): { type: FilteredLogEntryType; data: Record<string, unknown> } | null {
  const eventType = safeString(event.type);

  // System / init events — keep model + session_id only
  if (eventType === 'system' || eventType === 'init' || eventType === 'system_init') {
    return {
      type: 'system_init',
      data: {
        model: safeString(event.model ?? (event.data as Record<string, unknown> | undefined)?.model),
        sessionId: safeString(event.session_id ?? event.sessionId ?? (event.data as Record<string, unknown> | undefined)?.session_id),
      },
    };
  }

  // Assistant text messages — keep full text
  if (eventType === 'assistant' || eventType === 'assistant_message') {
    const text = safeString(event.text ?? event.message ?? event.content);
    if (text.length === 0) return null;
    return {
      type: 'assistant_message',
      data: { text },
    };
  }

  // User messages — keep full text
  if (eventType === 'user' || eventType === 'user_message') {
    const text = safeString(event.text ?? event.message ?? event.content);
    if (text.length === 0) return null;
    return {
      type: 'user_message',
      data: { text },
    };
  }

  // Tool use blocks — keep name + truncated input + success/fail
  if (eventType === 'tool_use') {
    const name = safeString(event.name ?? event.tool_name);
    const rawInput = event.input ?? event.tool_input ?? '';
    const inputStr = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);
    const success = event.success === undefined ? undefined : Boolean(event.success);

    const data: Record<string, unknown> = {
      name,
      input: truncate(inputStr, TOOL_INPUT_MAX_LENGTH),
    };

    if (success !== undefined) {
      data.success = success;
    }

    return { type: 'tool_use', data };
  }

  // Tool result blocks — keep status + truncated output
  if (eventType === 'tool_result') {
    const status = safeString(event.status ?? event.result_status ?? 'unknown');
    const rawOutput = event.output ?? event.content ?? event.result ?? '';
    const outputStr = typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput);

    return {
      type: 'tool_result',
      data: {
        status,
        output: truncate(outputStr, TOOL_OUTPUT_MAX_LENGTH),
      },
    };
  }

  // Result / usage — keep full token counts
  if (eventType === 'result' || eventType === 'usage') {
    const usage = (event.usage ?? event) as Record<string, unknown>;
    return {
      type: 'usage',
      data: {
        inputTokens: safeNumber(usage.input_tokens ?? usage.inputTokens),
        outputTokens: safeNumber(usage.output_tokens ?? usage.outputTokens),
        totalTokens: safeNumber(usage.total_tokens ?? usage.totalTokens),
        cacheReadTokens: safeNumber(usage.cache_read_tokens ?? usage.cacheReadTokens),
        cacheCreationTokens: safeNumber(usage.cache_creation_tokens ?? usage.cacheCreationTokens),
      },
    };
  }

  // Errors — keep full error message + stack
  if (eventType === 'error') {
    return {
      type: 'error',
      data: {
        message: safeString(event.message ?? event.error),
        stack: safeString(event.stack),
      },
    };
  }

  // stream_event deltas and anything else — DISCARD
  return null;
}

// ─── Factory ─────────────────────────────────────────────────

export function createSessionWriter(sessionDir: string, agentName: string): SessionWriter {
  // Ensure session directory exists
  mkdirSync(sessionDir, { recursive: true });

  const jsonlPath = join(sessionDir, `${agentName}.jsonl`);
  const summaryPath = join(sessionDir, `${agentName}.summary.json`);

  // Derive sessionId from the directory or agent name for log entries
  let currentSessionId = '';

  // Running summary state — starts empty, merged on each updateSummary call
  let summaryState: Partial<SessionSummary> = {
    agentName,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    toolCallCount: 0,
    toolCallsByName: {},
    errorCount: 0,
    messageCount: 0,
    filesChanged: 0,
  };

  function writeSummary(): void {
    writeFileSync(summaryPath, JSON.stringify(summaryState, null, 2), 'utf-8');
  }

  const writer: SessionWriter = {
    appendEvent(event: StreamEvent): void {
      const classified = classifyEvent(event);
      if (!classified) return;

      // Capture sessionId from system_init events
      if (classified.type === 'system_init' && typeof classified.data.sessionId === 'string' && classified.data.sessionId.length > 0) {
        currentSessionId = classified.data.sessionId;
      }

      const entry: FilteredLogEntry = {
        type: classified.type,
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
        data: classified.data,
      };

      const line = `${JSON.stringify(entry)}\n`;
      appendFileSync(jsonlPath, line, 'utf-8');
    },

    updateSummary(partial: Partial<SessionSummary>): void {
      summaryState = { ...summaryState, ...partial };
      writeSummary();
    },

    finalize(exitCode: number | null): void {
      const endedAt = new Date().toISOString();
      const startedAt = summaryState.startedAt ?? endedAt;
      const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();

      const status: SessionSummary['status'] =
        exitCode === null || exitCode === 0 ? 'completed' : 'failed';

      summaryState = {
        ...summaryState,
        endedAt,
        durationMs: Math.max(0, durationMs),
        exitCode,
        status,
      };

      writeSummary();
    },
  };

  return writer;
}
