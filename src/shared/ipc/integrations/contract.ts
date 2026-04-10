/**
 * Integrations IPC Contract
 *
 * Unified contract aggregating invoke and event channel definitions
 * for email, notifications, Spotify, and GitHub integrations.
 *
 * Domain contracts are imported directly from their source files to
 * avoid duplication. The merged exports provide a single import
 * point for the integrations domain.
 */

import { emailEvents, emailInvoke } from '../email/contract';
import { githubEvents, githubInvoke } from '../github/contract';
import { notificationsEvents, notificationsInvoke } from '../notifications/contract';
import { spotifyInvoke } from '../spotify/contract';

// ─── Merged Invoke Contract ──────────────────────────────────

export const integrationsInvoke = {
  ...emailInvoke,
  ...notificationsInvoke,
  ...spotifyInvoke,
  ...githubInvoke,
} as const;

// ─── Merged Event Contract ────────────────────────────────────

export const integrationsEvents = {
  ...emailEvents,
  ...notificationsEvents,
  ...githubEvents,
} as const;

// ─── Per-domain re-exports for backwards compatibility ────────

export { emailEvents, emailInvoke } from '../email/contract';
export { githubEvents, githubInvoke } from '../github/contract';
export { notificationsEvents, notificationsInvoke } from '../notifications/contract';
export { spotifyInvoke } from '../spotify/contract';
