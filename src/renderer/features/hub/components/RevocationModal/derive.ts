/**
 * RevocationModal — pure derivation helpers.
 *
 * Kept as standalone, side-effect-free functions so they can be unit-tested
 * in the renderer's node test environment (no DOM / react-testing-library
 * required). The modal component imports these helpers.
 */

import type { HUB } from '@shared/ipc/hub/channels';
import type { InvokeOutput } from '@shared/ipc-contract';

type DiscoveredListSnapshot = InvokeOutput<typeof HUB.DISCOVERED.LIST>;

export type HubRecord = DiscoveredListSnapshot['paired'][number];

/** Initial/closed modal state. */
export const INITIAL_REVOCATION_STATE: RevocationModalState = {
  open: false,
  hubId: '',
  reason: '',
};

export interface RevocationModalState {
  open: boolean;
  hubId: string;
  reason: string;
}

export interface RevocationEventPayload {
  hubId: string;
  reason: string;
}

/**
 * Compute the next modal state when a hub.revoked event arrives.
 *
 * Always transitions to open=true with the event's hubId + reason. If the
 * modal is already open for a different hubId, the new event takes
 * precedence (most recent revocation wins).
 */
export function stateOnRevoked(
  _prev: RevocationModalState,
  payload: RevocationEventPayload,
): RevocationModalState {
  return {
    open: true,
    hubId: payload.hubId,
    reason: payload.reason,
  };
}

/**
 * Compute the next modal state when the user dismisses the modal.
 *
 * Clears hubId/reason so a stale message can't flash on re-open.
 */
export function stateOnDismiss(_prev: RevocationModalState): RevocationModalState {
  return INITIAL_REVOCATION_STATE;
}

/**
 * Resolve the display name for a revoked hubId.
 *
 * Looks up the paired list first (the revoked hub may still be in there —
 * revocation doesn't automatically delete the client's record). Falls back
 * to the raw hubId so the user always sees *something* identifying.
 */
export function resolveDisplayName(
  paired: readonly HubRecord[] | undefined,
  hubId: string,
): string {
  if (!hubId) return '';
  if (!paired) return hubId;
  const match = paired.find((record) => record.hubId === hubId);
  return match?.displayName ?? hubId;
}
