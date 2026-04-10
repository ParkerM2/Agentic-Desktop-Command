/**
 * Relay Feature — Barrel Export
 *
 * Cross-device relay service for project claiming and remote
 * session management through the Hub.
 */

export { createRelayService } from './relay-service';
export { registerRelayHandlers } from './relay-handlers';
export type { RelayService, RelaySendFn, ClaimResult } from './relay-service';
