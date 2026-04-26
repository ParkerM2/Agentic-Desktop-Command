/**
 * Peer-domain string formatters.
 *
 * Replaces the older `lib/truncate.ts` which was a single-fn module. All
 * helpers are pure and shared across `OutgoingPairDialog`, `PeerListPanel`,
 * `IncomingPinDialog`, and the `useOutgoingPair` presentation hook.
 */

import { PEER_ID_DISPLAY_MAX, PIN_LENGTH } from '@shared/ipc/peers';

const ELLIPSIS = '…';

/** Truncate a value (e.g. peerId, fingerprint) to N chars + ellipsis. */
export function truncate(value: string, max = PEER_ID_DISPLAY_MAX): string {
  return value.length <= max ? value : `${value.slice(0, max)}${ELLIPSIS}`;
}

/**
 * Render-friendly label for any peer-shaped record:
 * `displayName` if set, otherwise a truncated peerId.
 */
export function peerLabel(peer: {
  displayName: string | null;
  peerId: string;
}): string {
  return peer.displayName ?? truncate(peer.peerId);
}

/**
 * Strip every non-digit character and clamp to the canonical PIN length.
 * Used in the PIN entry field on the initiator side; defends against pasted
 * values like `"1-2-3-4-5-6"` or extra whitespace.
 */
export function sanitizePin(raw: string): string {
  return raw.replaceAll(/\D/g, '').slice(0, PIN_LENGTH);
}
