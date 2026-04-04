/**
 * JSONL Watcher
 *
 * Watches `<projectPath>/progress/` recursively for `events.jsonl` file changes.
 * Tails new lines from events.jsonl (tracks byte offset per file) and emits:
 *  - onMilestone  for events with milestone: true
 *  - onPermission for events with event: "permission.required"
 *
 * Also watches `<projectPath>/.claude/.current-context.json` for active context
 * changes and emits onContext accordingly.
 *
 * Uses only node:fs — no chokidar dependency required.
 */

import { closeSync, existsSync, openSync, readFileSync, readSync, statSync, watch } from 'node:fs';
import { join } from 'node:path';

import { watcherLogger } from '@main/lib/logger';

import type { FSWatcher } from 'node:fs';

// ─── Types ──────────────────────────────────────────────────

export interface MilestoneEvent {
  ticket: string;
  run: string | null;
  event: string;
  agent: string | null;
  ts: string;
  data: Record<string, unknown>;
}

export interface WorkflowContext {
  ticket: string | null;
  phase: 'research' | 'plan' | 'agent-team' | null;
  runSlug: string | null;
}

export interface JsonlWatcher {
  start: () => void;
  stop: () => void;
  onMilestone: (cb: (event: MilestoneEvent) => void) => void;
  onContext: (cb: (context: WorkflowContext | null) => void) => void;
  onPermission: (cb: (ticket: string, agent: string, message: string) => void) => void;
}

// ─── Helpers ────────────────────────────────────────────────

/** Read bytes from `offset` to end-of-file and return new complete lines.
 *
 * Handles partial writes: if the chunk does not end with `\n`, the trailing
 * incomplete line is excluded and the returned offset stops before it so the
 * line will be re-read on the next watch event once the write completes.
 */
function readNewLines(filePath: string, offset: number): { lines: string[]; newOffset: number } {
  try {
    const stat = statSync(filePath);
    if (stat.size <= offset) {
      return { lines: [], newOffset: offset };
    }

    const { size } = stat;
    const buffer = Buffer.alloc(size - offset);
    const fd = openSync(filePath, 'r');
    try {
      readSync(fd, buffer, 0, buffer.length, offset);
    } finally {
      closeSync(fd);
    }

    const chunk = buffer.toString('utf-8');

    // If the chunk ends mid-line, back the offset up to just after the last
    // newline so the incomplete line is re-read on the next event.
    const endsWithNewline = chunk.endsWith('\n');
    const safeChunk = endsWithNewline ? chunk : chunk.slice(0, chunk.lastIndexOf('\n') + 1);
    const newOffset = endsWithNewline ? size : offset + Buffer.byteLength(safeChunk, 'utf-8');

    const lines = safeChunk.split('\n').filter((l) => l.trim().length > 0);
    return { lines, newOffset };
  } catch {
    return { lines: [], newOffset: offset };
  }
}

/** Parse a raw JSONL line into a typed record, or null on failure. */
function parseJsonlLine(line: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(line);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function getString(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key];
  return typeof val === 'string' ? val : null;
}

/** Read and parse .current-context.json, returning null if missing/invalid. */
function readContextFile(contextPath: string): WorkflowContext | null {
  try {
    if (!existsSync(contextPath)) {
      return null;
    }
    const raw = readFileSync(contextPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const obj = parsed as Record<string, unknown>;

    const ticket = getString(obj, 'ticket');
    const rawPhase = getString(obj, 'phase');
    const phase =
      rawPhase === 'research' || rawPhase === 'plan' || rawPhase === 'agent-team'
        ? rawPhase
        : null;
    const runSlug = getString(obj, 'runSlug');

    return { ticket, phase, runSlug };
  } catch {
    return null;
  }
}

// ─── Factory ────────────────────────────────────────────────

export function createJsonlWatcher(projectPath: string): JsonlWatcher {
  const progressDir = join(projectPath, 'progress');
  const contextPath = join(projectPath, '.claude', '.current-context.json');

  const milestoneListeners: Array<(event: MilestoneEvent) => void> = [];
  const contextListeners: Array<(ctx: WorkflowContext | null) => void> = [];
  const permissionListeners: Array<(ticket: string, agent: string, message: string) => void> = [];

  /** Byte offsets per absolute file path. Reset when file shrinks (rotation). */
  const fileOffsets = new Map<string, number>();

  let progressWatcher: FSWatcher | null = null;
  let contextWatcher: FSWatcher | null = null;

  // ── Emit helpers ──

  function emitMilestone(event: MilestoneEvent): void {
    for (const cb of milestoneListeners) {
      cb(event);
    }
  }

  function emitContext(ctx: WorkflowContext | null): void {
    for (const cb of contextListeners) {
      cb(ctx);
    }
  }

  function emitPermission(ticket: string, agent: string, message: string): void {
    for (const cb of permissionListeners) {
      cb(ticket, agent, message);
    }
  }

  // ── JSONL processing ──

  function processJsonlFile(filePath: string): void {
    const prevOffset = fileOffsets.get(filePath) ?? 0;

    // Detect file rotation: if file is smaller than our offset, reset
    let currentSize = 0;
    try {
      currentSize = statSync(filePath).size;
    } catch {
      return;
    }

    const effectiveOffset = currentSize < prevOffset ? 0 : prevOffset;
    const { lines, newOffset } = readNewLines(filePath, effectiveOffset);
    fileOffsets.set(filePath, newOffset);

    for (const line of lines) {
      const record = parseJsonlLine(line);
      if (!record) {
        continue;
      }

      // Only process milestone events
      if (record.milestone !== true) {
        continue;
      }

      const ticket = getString(record, 'ticket') ?? '';
      const run = getString(record, 'run');
      const event = getString(record, 'event') ?? '';
      const agent = getString(record, 'agent');
      const ts = getString(record, 'ts') ?? new Date().toISOString();
      const rawData = record.data;
      const data: Record<string, unknown> =
        rawData !== null && typeof rawData === 'object' && !Array.isArray(rawData)
          ? (rawData as Record<string, unknown>)
          : {};

      const milestoneEvent: MilestoneEvent = { ticket, run, event, agent, ts, data };
      emitMilestone(milestoneEvent);

      if (event === 'permission.required') {
        const agentStr = agent ?? '';
        const message = typeof data.message === 'string' ? data.message : '';
        emitPermission(ticket, agentStr, message);
      }
    }
  }

  // ── Watchers ──

  function startProgressWatcher(): void {
    if (!existsSync(progressDir)) {
      watcherLogger.info(`[JsonlWatcher] Progress dir does not exist, skipping: ${progressDir}`);
      return;
    }

    watcherLogger.info(`[JsonlWatcher] Watching progress dir: ${progressDir}`);

    try {
      progressWatcher = watch(progressDir, { recursive: true }, (_eventType, filename) => {
        if (typeof filename !== 'string' || !filename.endsWith('events.jsonl')) {
          return;
        }

        // filename from recursive watch is relative to watched dir
        const filePath = join(progressDir, filename);
        if (!existsSync(filePath)) {
          return;
        }

        processJsonlFile(filePath);
      });

      progressWatcher.on('error', (err) => {
        watcherLogger.error('[JsonlWatcher] Progress watch error:', err.message);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      watcherLogger.error('[JsonlWatcher] Failed to start progress watcher:', message);
    }
  }

  function startContextWatcher(): void {
    const contextDir = join(projectPath, '.claude');

    if (!existsSync(contextDir)) {
      watcherLogger.info('[JsonlWatcher] .claude dir does not exist, skipping context watch');
      return;
    }

    watcherLogger.info(`[JsonlWatcher] Watching context file: ${contextPath}`);

    try {
      contextWatcher = watch(contextDir, (_eventType, filename) => {
        if (typeof filename !== 'string' || !filename.includes('.current-context.json')) {
          return;
        }
        const ctx = readContextFile(contextPath);
        emitContext(ctx);
      });

      contextWatcher.on('error', (err) => {
        watcherLogger.error('[JsonlWatcher] Context watch error:', err.message);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      watcherLogger.error('[JsonlWatcher] Failed to start context watcher:', message);
    }
  }

  return {
    start() {
      startProgressWatcher();
      startContextWatcher();

      // Emit initial context state on start
      const initialCtx = readContextFile(contextPath);
      emitContext(initialCtx);
    },

    stop() {
      if (progressWatcher) {
        progressWatcher.close();
        progressWatcher = null;
        watcherLogger.info('[JsonlWatcher] Stopped progress watcher');
      }
      if (contextWatcher) {
        contextWatcher.close();
        contextWatcher = null;
        watcherLogger.info('[JsonlWatcher] Stopped context watcher');
      }
      fileOffsets.clear();
    },

    onMilestone(cb) {
      milestoneListeners.push(cb);
    },

    onContext(cb) {
      contextListeners.push(cb);
    },

    onPermission(cb) {
      permissionListeners.push(cb);
    },
  };
}
