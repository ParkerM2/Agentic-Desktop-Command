/**
 * Integrations IPC — Channel Constants
 *
 * Unified INTEGRATIONS namespace aggregating channel constants for
 * email, notifications, Spotify, and GitHub integrations.
 *
 * Sub-domain exports (EMAIL, NOTIFICATIONS, SPOTIFY, GITHUB) serve as
 * backwards-compatible aliases so existing imports continue to work.
 */

import { domain, events } from '../channel-builder';

// ─── Email ────────────────────────────────────────────────────

const EMAIL_CHANNELS = domain('email', {
  SEND: ['message'],
  GET: ['config', 'queue'],
  UPDATE: ['config'],
  TEST: ['connection'],
  RETRY: ['queued'],
  REMOVE: ['queued'],
});

const EMAIL_EVENT_CHANNELS = events('email', {
  MESSAGE: ['sent', 'failed'],
});

// ─── Notifications ────────────────────────────────────────────

const NOTIFICATIONS_CHANNELS = domain('notifications', {
  LIST: ['all'],
  MARK: ['read', 'all-read'],
  GET: ['config', 'watcher-status'],
  UPDATE: ['config'],
  START: ['watching'],
  STOP: ['watching'],
});

const NOTIFICATIONS_EVENT_CHANNELS = events('notifications', {
  NOTIFICATION: ['new'],
  WATCHER: ['error', 'status-changed'],
});

// ─── Spotify ──────────────────────────────────────────────────

const SPOTIFY_CHANNELS = domain('spotify', {
  GET: ['playback'],
  PLAY: ['track'],
  PAUSE: ['track'],
  SKIP: ['next', 'previous'],
  SEARCH: ['tracks'],
  SET: ['volume'],
  ADD: ['to-queue'],
});

// ─── GitHub ───────────────────────────────────────────────────

const GITHUB_CHANNELS = domain('github', {
  LIST: ['prs', 'issues', 'repos'],
  GET: ['pr', 'notifications', 'auth-status'],
  CREATE: ['issue'],
});

const GITHUB_EVENT_CHANNELS = events('github', {
  DATA: ['updated'],
});

// ─── Unified Namespace ────────────────────────────────────────

export const INTEGRATIONS = {
  EMAIL: EMAIL_CHANNELS,
  EMAIL_EVENTS: EMAIL_EVENT_CHANNELS,
  NOTIFICATIONS: NOTIFICATIONS_CHANNELS,
  NOTIFICATIONS_EVENTS: NOTIFICATIONS_EVENT_CHANNELS,
  SPOTIFY: SPOTIFY_CHANNELS,
  GITHUB: GITHUB_CHANNELS,
  GITHUB_EVENTS: GITHUB_EVENT_CHANNELS,
} as const;

// ─── Backwards-Compatible Aliases ────────────────────────────
// These allow existing imports from individual domain channels.ts
// to continue resolving without modification.

export const {
  EMAIL,
  EMAIL_EVENTS,
  NOTIFICATIONS,
  NOTIFICATIONS_EVENTS,
  SPOTIFY,
  GITHUB,
  GITHUB_EVENTS,
} = INTEGRATIONS;
