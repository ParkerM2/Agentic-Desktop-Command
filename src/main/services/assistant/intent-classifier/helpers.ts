/**
 * Intent Classifier Helpers
 *
 * Shared utility functions used by pattern matchers.
 */

import {
  createTimeParserService,
  type TimeParserService,
} from '../../time-parser/time-parser-service';

// ── Regex constants ─────────────────────────────────────────────

const TASK_ID_PATTERN = /task\s+#?(\d+)/i;
const TASK_NAME_PATTERN = /task\s+"([^"]+)"/i;
const FOLLOW_UP_PATTERN = /(?:,\s*and\s+(?:then\s+)?|,\s*and\s+I'?ll\s+)(.*)/i;

// ── Public helpers ──────────────────────────────────────────────

export function extractTaskId(input: string): string {
  const idMatch = TASK_ID_PATTERN.exec(input);
  if (idMatch?.[1]) {
    return idMatch[1];
  }
  const nameMatch = TASK_NAME_PATTERN.exec(input);
  return nameMatch?.[1] ?? '';
}

export function extractFollowUp(input: string): string {
  const match = FOLLOW_UP_PATTERN.exec(input);
  return match?.[1]?.trim() ?? '';
}

export function resolveWatchCondition(input: string): string {
  if (/(?:is\s+)?(?:done|complete|finished)/i.test(input)) {
    return 'done';
  }
  if (/(?:fails?|errors?|crashes?)/i.test(input)) {
    return 'error';
  }
  return 'changes';
}

export function stripPrefix(input: string, pattern: RegExp): string {
  return input.replace(pattern, '').trim();
}

// ── Lazy-initialized time parser ────────────────────────────────

let timeParserService: TimeParserService | null = null;

export function getTimeParser(): TimeParserService {
  timeParserService ??= createTimeParserService();
  return timeParserService;
}
