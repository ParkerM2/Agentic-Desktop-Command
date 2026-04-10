/**
 * Relay IPC Contract
 *
 * Invoke and event channel definitions for the hub relay system.
 * Covers project claiming/releasing, remote session spawning,
 * session I/O, and claim lifecycle events.
 */

import { z } from 'zod';

import { RELAY, RELAY_EVENTS } from './channels';
import {
  relayClaimProjectInputSchema,
  relayClaimProjectOutputSchema,
  relayClaimReclaimedPayloadSchema,
  relayGetBufferInputSchema,
  relayGetBufferOutputSchema,
  relayListSessionsInputSchema,
  relayProjectClaimedPayloadSchema,
  relayProjectUnclaimedPayloadSchema,
  relayReclaimProjectInputSchema,
  relayReclaimProjectOutputSchema,
  relayReleaseProjectInputSchema,
  relayReleaseProjectOutputSchema,
  relayRenewClaimInputSchema,
  relayRenewClaimOutputSchema,
  relaySendInputInputSchema,
  relaySendInputOutputSchema,
  relaySessionEndedPayloadSchema,
  relaySessionOutputPayloadSchema,
  relaySessionSchema,
  relaySessionSpawnedPayloadSchema,
  relaySpawnSessionInputSchema,
  relaySpawnSessionOutputSchema,
} from './schemas';

// ── Invoke Channels ─────────────────────────────────────────────

export const relayInvoke = {
  [RELAY.CLAIM.PROJECT]: {
    input: relayClaimProjectInputSchema,
    output: relayClaimProjectOutputSchema,
  },
  [RELAY.RELEASE.PROJECT]: {
    input: relayReleaseProjectInputSchema,
    output: relayReleaseProjectOutputSchema,
  },
  [RELAY.RECLAIM.PROJECT]: {
    input: relayReclaimProjectInputSchema,
    output: relayReclaimProjectOutputSchema,
  },
  [RELAY.SPAWN.SESSION]: {
    input: relaySpawnSessionInputSchema,
    output: relaySpawnSessionOutputSchema,
  },
  [RELAY.SEND.INPUT]: {
    input: relaySendInputInputSchema,
    output: relaySendInputOutputSchema,
  },
  [RELAY.LIST.SESSIONS]: {
    input: relayListSessionsInputSchema,
    output: z.array(relaySessionSchema),
  },
  [RELAY.GET.BUFFER]: {
    input: relayGetBufferInputSchema,
    output: relayGetBufferOutputSchema,
  },
  [RELAY.RENEW.CLAIM]: {
    input: relayRenewClaimInputSchema,
    output: relayRenewClaimOutputSchema,
  },
} as const;

// ── Event Channels ──────────────────────────────────────────────

export const relayEvents = {
  [RELAY_EVENTS.PROJECT.CLAIMED]: {
    payload: relayProjectClaimedPayloadSchema,
  },
  [RELAY_EVENTS.PROJECT.UNCLAIMED]: {
    payload: relayProjectUnclaimedPayloadSchema,
  },
  [RELAY_EVENTS.SESSION.SPAWNED]: {
    payload: relaySessionSpawnedPayloadSchema,
  },
  [RELAY_EVENTS.SESSION.OUTPUT]: {
    payload: relaySessionOutputPayloadSchema,
  },
  [RELAY_EVENTS.SESSION.ENDED]: {
    payload: relaySessionEndedPayloadSchema,
  },
  [RELAY_EVENTS.CLAIM.RECLAIMED]: {
    payload: relayClaimReclaimedPayloadSchema,
  },
} as const;
