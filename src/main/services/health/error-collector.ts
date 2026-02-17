/**
 * Error Collector — Collects, persists, and reports application errors
 *
 * Persists errors to `{dataDir}/error-log.json` using atomic writes.
 * On init, loads existing log and prunes entries older than 7 days.
 * Uses callback hooks for event emission (decoupled from IPC).
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  ErrorCategory,
  ErrorContext,
  ErrorEntry,
  ErrorSeverity,
  ErrorStats,
  ErrorTier,
} from '@shared/types/health';

import { safeWriteJson } from '../../lib/safe-write-json';

// ─── Types ───────────────────────────────────────────────────────

export type { ErrorCategory, ErrorContext, ErrorEntry, ErrorSeverity, ErrorStats, ErrorTier };

export interface ErrorReportInput {
  severity: ErrorSeverity;
  tier: ErrorTier;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context?: Partial<ErrorContext>;
}

// ─── Service Interface ───────────────────────────────────────────

export interface ErrorCollector {
  report: (input: ErrorReportInput) => ErrorEntry;
  getLog: (since?: string) => ErrorEntry[];
  getStats: () => ErrorStats;
  clear: () => void;
  dispose: () => void;
}

export interface ErrorCollectorCallbacks {
  onError?: (entry: ErrorEntry) => void;
  onCapacityAlert?: (count: number, message: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────

const LOG_FILE_NAME = 'error-log.json';
const PRUNE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CAPACITY_ALERT_THRESHOLD = 50;

// ─── Helpers ─────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isErrorEntryArray(value: unknown): value is ErrorEntry[] {
  return Array.isArray(value);
}

function createEmptyStats(): ErrorStats {
  return {
    total: 0,
    byTier: { app: 0, project: 0, personal: 0 },
    bySeverity: { error: 0, warning: 0, info: 0 },
    last24h: 0,
  };
}

// ─── Factory ─────────────────────────────────────────────────────

export function createErrorCollector(
  dataDir: string,
  callbacks?: ErrorCollectorCallbacks,
): ErrorCollector {
  const filePath = join(dataDir, LOG_FILE_NAME);
  let entries: ErrorEntry[] = [];
  let sessionErrorCount = 0;

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Load existing log (gracefully handle corrupted files)
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      if (isErrorEntryArray(parsed)) {
        entries = parsed;
      }
    } catch {
      console.warn('[ErrorCollector] Corrupted log file — starting fresh');
      entries = [];
    }
  }

  // Prune entries older than 7 days
  const pruneThreshold = Date.now() - PRUNE_AGE_MS;
  const beforePrune = entries.length;
  entries = entries.filter((e) => new Date(e.timestamp).getTime() > pruneThreshold);
  if (entries.length < beforePrune) {
    console.log(
      `[ErrorCollector] Pruned ${String(beforePrune - entries.length)} entries older than 7 days`,
    );
    safeWriteJson(filePath, entries);
  }

  function persist(): void {
    safeWriteJson(filePath, entries);
  }

  return {
    report(input) {
      const entry: ErrorEntry = {
        id: generateId(),
        severity: input.severity,
        tier: input.tier,
        category: input.category,
        message: input.message,
        stack: input.stack,
        context: input.context ?? {},
        timestamp: new Date().toISOString(),
      };

      entries.push(entry);
      persist();

      sessionErrorCount += 1;

      // Notify via callback
      callbacks?.onError?.(entry);

      // Check capacity alert threshold
      if (sessionErrorCount >= CAPACITY_ALERT_THRESHOLD) {
        callbacks?.onCapacityAlert?.(
          sessionErrorCount,
          `Error collector has recorded ${String(sessionErrorCount)} errors this session`,
        );
      }

      return entry;
    },

    getLog(since) {
      if (!since) {
        return [...entries];
      }
      const sinceTime = new Date(since).getTime();
      return entries.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
    },

    getStats() {
      const stats = createEmptyStats();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      stats.total = entries.length;

      for (const entry of entries) {
        stats.byTier[entry.tier] += 1;
        stats.bySeverity[entry.severity] += 1;

        if (new Date(entry.timestamp).getTime() > oneDayAgo) {
          stats.last24h += 1;
        }
      }

      return stats;
    },

    clear() {
      entries = [];
      sessionErrorCount = 0;
      persist();
    },

    dispose() {
      if (entries.length > 0) {
        persist();
      }
    },
  };
}
