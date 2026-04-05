/**
 * Unit Tests for Notification Filter
 *
 * Tests the matchesFilter function for source, type, unread, and keyword filtering.
 */

import { describe, expect, it } from 'vitest';

const { matchesFilter } = await import('@main/services/notifications/notification-filter');

import type { Notification, NotificationFilter } from '@shared/types';

// ── Helpers ─────────────────────────────────────────────────────

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    source: 'github',
    type: 'pr_review',
    title: 'Review requested',
    body: 'Please review PR #42',
    url: 'https://github.com/test/pr/42',
    timestamp: new Date().toISOString(),
    read: false,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('Notification Filter', () => {
  describe('matchesFilter()', () => {
    it('returns true when filter is empty', () => {
      const notification = makeNotification();
      const filter: NotificationFilter = {};
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    // Source filtering
    it('matches when notification source is in filter sources', () => {
      const notification = makeNotification({ source: 'github' });
      const filter: NotificationFilter = { sources: ['github'] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    it('rejects when notification source is not in filter sources', () => {
      const notification = makeNotification({ source: 'slack' });
      const filter: NotificationFilter = { sources: ['github'] };
      expect(matchesFilter(notification, filter)).toBe(false);
    });

    it('matches when sources array is empty (no filter)', () => {
      const notification = makeNotification({ source: 'slack' });
      const filter: NotificationFilter = { sources: [] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    // Type filtering
    it('matches when notification type is in filter types', () => {
      const notification = makeNotification({ type: 'pr_review' });
      const filter: NotificationFilter = { types: ['pr_review', 'ci_status'] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    it('rejects when notification type is not in filter types', () => {
      const notification = makeNotification({ type: 'pr_comment' });
      const filter: NotificationFilter = { types: ['pr_review'] };
      expect(matchesFilter(notification, filter)).toBe(false);
    });

    it('matches when types array is empty (no filter)', () => {
      const notification = makeNotification({ type: 'mention' });
      const filter: NotificationFilter = { types: [] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    // Unread only filtering
    it('matches unread notification when unreadOnly is true', () => {
      const notification = makeNotification({ read: false });
      const filter: NotificationFilter = { unreadOnly: true };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    it('rejects read notification when unreadOnly is true', () => {
      const notification = makeNotification({ read: true });
      const filter: NotificationFilter = { unreadOnly: true };
      expect(matchesFilter(notification, filter)).toBe(false);
    });

    it('matches read notification when unreadOnly is false', () => {
      const notification = makeNotification({ read: true });
      const filter: NotificationFilter = { unreadOnly: false };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    // Keyword filtering
    it('matches when keyword is found in title', () => {
      const notification = makeNotification({ title: 'Critical bug fix', body: '' });
      const filter: NotificationFilter = { keywords: ['critical'] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    it('matches when keyword is found in body', () => {
      const notification = makeNotification({ title: '', body: 'This is urgent' });
      const filter: NotificationFilter = { keywords: ['urgent'] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    it('keyword matching is case-insensitive', () => {
      const notification = makeNotification({ title: 'CRITICAL BUG', body: '' });
      const filter: NotificationFilter = { keywords: ['critical'] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    it('rejects when no keywords match', () => {
      const notification = makeNotification({ title: 'Minor fix', body: 'Small change' });
      const filter: NotificationFilter = { keywords: ['critical', 'urgent'] };
      expect(matchesFilter(notification, filter)).toBe(false);
    });

    it('matches if any keyword matches (OR logic)', () => {
      const notification = makeNotification({ title: 'Urgent fix', body: '' });
      const filter: NotificationFilter = { keywords: ['critical', 'urgent'] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    it('matches when keywords array is empty', () => {
      const notification = makeNotification();
      const filter: NotificationFilter = { keywords: [] };
      expect(matchesFilter(notification, filter)).toBe(true);
    });

    // Combined filters
    it('requires all filter conditions to pass', () => {
      const notification = makeNotification({
        source: 'github',
        type: 'pr_review',
        read: false,
        title: 'Urgent PR',
        body: '',
      });

      const filter: NotificationFilter = {
        sources: ['github'],
        types: ['pr_review'],
        unreadOnly: true,
        keywords: ['urgent'],
      };

      expect(matchesFilter(notification, filter)).toBe(true);
    });

    it('rejects when one condition fails in combined filter', () => {
      const notification = makeNotification({
        source: 'slack', // Wrong source
        type: 'pr_review',
        read: false,
        title: 'Urgent',
      });

      const filter: NotificationFilter = {
        sources: ['github'],
        types: ['pr_review'],
        unreadOnly: true,
        keywords: ['urgent'],
      };

      expect(matchesFilter(notification, filter)).toBe(false);
    });
  });
});
