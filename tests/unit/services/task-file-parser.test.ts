/**
 * Unit Tests for TaskFileParser
 *
 * Tests parseTaskFile and extractTaskNumber — pure functions, no mocking needed.
 */

import { describe, expect, it } from 'vitest';

import { extractTaskNumber, parseTaskFile } from '@main/services/progress-watcher-v2/task-file-parser';

// ── Helpers ───────────────────────────────────────────────────

function makeTaskFile(opts: {
  taskNumber?: number;
  taskName?: string;
  status?: string;
  criteria?: Array<{ text: string; met: boolean }>;
} = {}): string {
  const fm = [
    '---',
    `taskNumber: ${String(opts.taskNumber ?? 1)}`,
    `taskName: ${opts.taskName ?? 'Test Task'}`,
    `status: ${opts.status ?? 'pending'}`,
    '---',
  ].join('\n');

  const criteriaLines = (opts.criteria ?? [])
    .map((c) => `- [${c.met ? 'x' : ' '}] ${c.text}`)
    .join('\n');

  const body = criteriaLines.length > 0
    ? `\n## Acceptance Criteria\n${criteriaLines}\n`
    : '';

  return `${fm}\n${body}`;
}

// ── Tests ─────────────────────────────────────────────────────

describe('TaskFileParser', () => {
  describe('parseTaskFile()', () => {
    it('parses frontmatter correctly', () => {
      const content = makeTaskFile({
        taskNumber: 5,
        taskName: 'Implement login',
        status: 'in-progress',
      });

      const result = parseTaskFile(content);

      expect(result.taskNumber).toBe(5);
      expect(result.taskName).toBe('Implement login');
    });

    it('parses acceptance criteria checkboxes', () => {
      const content = makeTaskFile({
        criteria: [
          { text: 'Login form renders', met: true },
          { text: 'Validation works', met: false },
          { text: 'Error states shown', met: true },
        ],
      });

      const result = parseTaskFile(content);

      expect(result.acceptanceCriteria).toHaveLength(3);
      expect(result.acceptanceCriteria[0]).toEqual({ text: 'Login form renders', met: true });
      expect(result.acceptanceCriteria[1]).toEqual({ text: 'Validation works', met: false });
      expect(result.acceptanceCriteria[2]).toEqual({ text: 'Error states shown', met: true });
    });

    it('derives all-completed phases for completed status', () => {
      const content = makeTaskFile({ status: 'completed' });
      const result = parseTaskFile(content);

      expect(result.phases).toHaveLength(5);
      for (const phase of result.phases) {
        expect(phase.status).toBe('completed');
      }
    });

    it('derives all-completed phases for failed status', () => {
      const content = makeTaskFile({ status: 'failed' });
      const result = parseTaskFile(content);

      for (const phase of result.phases) {
        expect(phase.status).toBe('completed');
      }
    });

    it('derives all-pending phases for pending status', () => {
      const content = makeTaskFile({ status: 'pending' });
      const result = parseTaskFile(content);

      for (const phase of result.phases) {
        expect(phase.status).toBe('pending');
      }
    });

    it('derives mixed phases for in-progress status', () => {
      const content = makeTaskFile({ status: 'in-progress' });
      const result = parseTaskFile(content);

      expect(result.phases[0]?.status).toBe('completed');
      expect(result.phases[1]?.status).toBe('in-progress');
      expect(result.phases[2]?.status).toBe('pending');
      expect(result.phases[3]?.status).toBe('pending');
      expect(result.phases[4]?.status).toBe('pending');
    });

    it('returns defaults for empty content', () => {
      const result = parseTaskFile('');

      expect(result.taskNumber).toBe(0);
      expect(result.taskName).toBe('Unknown Task');
      expect(result.acceptanceCriteria).toEqual([]);
    });

    it('returns defaults for malformed frontmatter', () => {
      const result = parseTaskFile('not a valid task file');

      expect(result.taskNumber).toBe(0);
      expect(result.taskName).toBe('Unknown Task');
    });

    it('handles non-numeric taskNumber gracefully', () => {
      const content = '---\ntaskNumber: abc\ntaskName: Test\nstatus: pending\n---\n';
      const result = parseTaskFile(content);

      expect(result.taskNumber).toBe(0);
    });
  });

  describe('extractTaskNumber()', () => {
    it('extracts number from valid task filename', () => {
      expect(extractTaskNumber('task-1.md')).toBe(1);
      expect(extractTaskNumber('task-11.md')).toBe(11);
      expect(extractTaskNumber('task-999.md')).toBe(999);
    });

    it('returns null for invalid filenames', () => {
      expect(extractTaskNumber('notes.md')).toBeNull();
      expect(extractTaskNumber('task-.md')).toBeNull();
      expect(extractTaskNumber('task-abc.md')).toBeNull();
      expect(extractTaskNumber('task-1.txt')).toBeNull();
      expect(extractTaskNumber('')).toBeNull();
    });
  });
});
