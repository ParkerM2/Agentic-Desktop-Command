/**
 * Structured Logger — Thin wrapper around electron-log
 *
 * Provides scoped, structured logging with rotation, level control,
 * and ErrorCollector integration. All main-process code should use
 * scoped loggers instead of console.*.
 *
 * Usage:
 *   import { createScopedLogger } from '@main/lib/logger';
 *   const logger = createScopedLogger('hub');
 *   logger.info('Connected to hub at', url);
 *   logger.warn('Retry', { attempt: 3 });
 *   logger.error('Sync failed', error);
 */

import log from 'electron-log';

import type { LogLevel } from '@shared/types/settings';

export type { LogLevel };

// ─── Configuration ─────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

/**
 * Initialize the logger. Call once during app startup.
 */
export function initLogger(level: LogLevel = 'info'): void {
  // File transport — rotates at maxSize, old file moved to main.old.log
  log.transports.file.maxSize = MAX_FILE_SIZE;
  log.transports.file.format =
    '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] [{scope}] {text}';

  // Console transport (dev mode)
  log.transports.console.format = '[{level}] [{scope}] {text}';

  // Set level
  setLogLevel(level);

  log.info(`[Logger] Initialized — level=${level}, maxSize=${MAX_FILE_SIZE}`);
}

/**
 * Update the active log level at runtime.
 */
export function setLogLevel(level: LogLevel): void {
  log.transports.file.level = level;
  log.transports.console.level = level;
}

// ─── Scoped Loggers ────────────────────────────────────────────

/**
 * Create a scoped logger. The scope appears in log output as [{scope}].
 *
 * Standard scopes:
 * - app: lifecycle, startup, shutdown, auto-update, tray, hotkeys
 * - ipc: IPC router, handler calls, validation
 * - hub: Hub connection, sync, API, WebSocket
 * - agent: Agent spawn/stop, orchestrator, progress
 * - service: Generic service operations
 * - watcher: Notification watchers, progress watchers
 * - auth: Login, token refresh, OAuth flows
 * - mcp: MCP client, MCP server tools
 * - fs: File read/write, store operations
 */
export function createScopedLogger(scope: string): log.LogFunctions {
  return log.scope(scope);
}

// ─── Pre-built Scoped Loggers ──────────────────────────────────

export const appLogger = log.scope('app');
export const ipcLogger = log.scope('ipc');
export const hubLogger = log.scope('hub');
export const agentLogger = log.scope('agent');
export const serviceLogger = log.scope('service');
export const watcherLogger = log.scope('watcher');
export const authLogger = log.scope('auth');
export const mcpLogger = log.scope('mcp');
export const fsLogger = log.scope('fs');

// ─── Log File Path ─────────────────────────────────────────────

/**
 * Get the path to the current log file. Used by diagnostic export.
 */
export function getLogFilePath(): string {
  return log.transports.file.getFile().path;
}

export default log;
