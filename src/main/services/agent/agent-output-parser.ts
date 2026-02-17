/**
 * Agent Output Parser — Parse Claude CLI output for status/progress indicators
 *
 * @deprecated Part of the legacy agent system. The new workflow/task-launcher.ts
 * delegates output parsing to the Hub backend. Kept for backward compatibility.
 */

import {
  STATUS_RUNNING_PATTERNS,
  STATUS_COMPLETED_PATTERNS,
  STATUS_ERROR_PATTERNS,
  PROGRESS_PATTERNS,
} from '@shared/constants';

/**
 * Check if a line matches any of the given string patterns.
 */
export function matchesAny(line: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => line.includes(p));
}

/**
 * Parse Claude CLI output for status/progress indicators.
 * Returns event data if a status pattern is matched.
 */
export function parseClaudeOutput(
  line: string,
): { type: 'status' | 'log' | 'progress'; data: Record<string, unknown> } | null {
  if (matchesAny(line, STATUS_RUNNING_PATTERNS)) {
    return { type: 'status', data: { status: 'running' } };
  }
  if (matchesAny(line, STATUS_COMPLETED_PATTERNS)) {
    return { type: 'status', data: { status: 'completed' } };
  }
  if (matchesAny(line, STATUS_ERROR_PATTERNS)) {
    return { type: 'status', data: { status: 'error' } };
  }
  if (matchesAny(line, PROGRESS_PATTERNS)) {
    return { type: 'progress', data: { message: line } };
  }
  // Generic log
  if (line.trim().length > 0) {
    return { type: 'log', data: { message: line } };
  }
  return null;
}
