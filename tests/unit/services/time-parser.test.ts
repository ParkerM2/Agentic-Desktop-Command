/**
 * Unit Tests for TimeParserService
 *
 * Tests parseTime, parseRelativeTime, and parseTimeWithRecurring.
 * No mocking needed — chrono-node is a pure library.
 */

import { describe, expect, it } from 'vitest';

import { createTimeParserService } from '@main/services/time-parser/time-parser-service';

describe('TimeParserService', () => {
  const service = createTimeParserService();
  const ref = new Date('2026-04-05T12:00:00.000Z');

  // ── parseTime() ─────────────────────────────────────────────

  describe('parseTime()', () => {
    it('parses an absolute time expression', () => {
      const result = service.parseTime('April 10 at 3pm', ref);

      expect(result).not.toBeNull();
      expect(result!.date.getMonth()).toBe(3); // April
      expect(result!.date.getDate()).toBe(10);
      expect(result!.isRelative).toBe(false);
    });

    it('parses a relative time expression', () => {
      const result = service.parseTime('in 2 hours', ref);

      expect(result).not.toBeNull();
      expect(result!.isRelative).toBe(true);
    });

    it('parses "tomorrow at 9am"', () => {
      const result = service.parseTime('tomorrow at 9am', ref);

      expect(result).not.toBeNull();
      expect(result!.isRelative).toBe(true);
    });

    it('returns null for unparseable input', () => {
      const result = service.parseTime('xyzzy foobarbaz', ref);
      expect(result).toBeNull();
    });

    it('uses current date as reference when none provided', () => {
      const result = service.parseTime('in 5 minutes');
      expect(result).not.toBeNull();
    });
  });

  // ── parseRelativeTime() ─────────────────────────────────────

  describe('parseRelativeTime()', () => {
    it('parses "in 30 minutes"', () => {
      const result = service.parseRelativeTime('in 30 minutes');
      expect(result).toBeInstanceOf(Date);
    });

    it('parses "in 2 hours"', () => {
      const result = service.parseRelativeTime('in 2 hours');
      expect(result).toBeInstanceOf(Date);
    });

    it('returns null for unparseable input', () => {
      const result = service.parseRelativeTime('asdfqwerty');
      expect(result).toBeNull();
    });
  });

  // ── parseTimeWithRecurring() ────────────────────────────────

  describe('parseTimeWithRecurring()', () => {
    it('parses "every day at 9am" as daily recurring', () => {
      const result = service.parseTimeWithRecurring('every day at 9am', ref);

      expect(result).not.toBeNull();
      expect(result!.isRecurring).toBe(true);
      expect(result!.recurring?.frequency).toBe('daily');
      expect(result!.recurring?.time).toBe('09:00');
      expect(result!.confidence).toBe(0.9);
    });

    it('parses "every weekday at 2pm" as weekly Mon-Fri', () => {
      const result = service.parseTimeWithRecurring('every weekday at 2pm', ref);

      expect(result).not.toBeNull();
      expect(result!.isRecurring).toBe(true);
      expect(result!.recurring?.frequency).toBe('weekly');
      expect(result!.recurring?.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
      expect(result!.confidence).toBe(0.9);
    });

    it('parses "every mon and wed at 3pm" as weekly specific days', () => {
      const result = service.parseTimeWithRecurring(
        'every mon and wed at 3pm',
        ref,
      );

      expect(result).not.toBeNull();
      expect(result!.isRecurring).toBe(true);
      expect(result!.recurring?.frequency).toBe('weekly');
      expect(result!.recurring?.daysOfWeek).toContain(1); // Monday
      expect(result!.recurring?.daysOfWeek).toContain(3); // Wednesday
      expect(result!.confidence).toBe(0.85);
    });

    it('parses "every month on the 15th at 10am" as monthly', () => {
      const result = service.parseTimeWithRecurring(
        'every month on the 15th at 10am',
        ref,
      );

      expect(result).not.toBeNull();
      expect(result!.isRecurring).toBe(true);
      expect(result!.recurring?.frequency).toBe('monthly');
      expect(result!.confidence).toBe(0.8);
    });

    it('falls back to single-time parsing for non-recurring input', () => {
      const result = service.parseTimeWithRecurring('tomorrow at 5pm', ref);

      expect(result).not.toBeNull();
      expect(result!.isRecurring).toBe(false);
      expect(result!.recurring).toBeUndefined();
    });

    it('returns null for unparseable input', () => {
      const result = service.parseTimeWithRecurring('xyzzy foobarbaz', ref);
      expect(result).toBeNull();
    });

    it('calculates confidence based on certain components', () => {
      // An absolute date+time should have higher confidence
      const result = service.parseTimeWithRecurring('April 10, 2026 at 3:00pm', ref);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result!.confidence).toBeLessThanOrEqual(1);
    });
  });
});
