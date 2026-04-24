/**
 * HubPickerPanel — pure derivation helpers.
 *
 * Kept as standalone, side-effect-free functions so they can be unit-tested
 * in the renderer's node test environment (no DOM / react-testing-library
 * required). The picker component imports these helpers.
 */

import type { HUB } from '@shared/ipc/hub/channels';
import type { InvokeOutput } from '@shared/ipc-contract';

type DiscoveredListSnapshot = InvokeOutput<typeof HUB.DISCOVERED.LIST>;

export type HubRecord = DiscoveredListSnapshot['paired'][number];
export type DiscoveredHub = DiscoveredListSnapshot['discovered'][number];

/** Row-level status variant used by PairedRow. */
export type PairedRowStatus = 'connected' | 'reconnecting' | 'paired-offline' | 'error';

/**
 * Resolve the visual status for a paired row.
 *
 * The wire record already carries a `status` field but it is only meaningful
 * for the active hub. Inactive records are always reported as
 * `disconnected` by the main process — we relabel that as `paired-offline`
 * so the UI can distinguish "not the current hub" from "connection lost".
 */
export function resolvePairedRowStatus(
  record: HubRecord,
  activeHubId: string | null,
): PairedRowStatus {
  if (record.hubId !== activeHubId) return 'paired-offline';
  switch (record.status) {
    case 'connected':
      return 'connected';
    case 'connecting':
      return 'reconnecting';
    case 'error':
      return 'error';
    case 'disconnected':
      return 'paired-offline';
  }
}

/** Human-readable label for a paired-row status. */
export function labelForPairedRowStatus(status: PairedRowStatus): string {
  switch (status) {
    case 'connected':
      return 'connected';
    case 'reconnecting':
      return 'reconnecting';
    case 'error':
      return 'connection error';
    case 'paired-offline':
      return 'offline';
  }
}

/**
 * Filter the discovered list so already-paired hubs are not shown twice.
 * Also drops stale records so the picker doesn't encourage the user to
 * pair with a hub that vanished from the network.
 */
export function filterDiscovered(
  paired: readonly HubRecord[],
  discovered: readonly DiscoveredHub[],
): DiscoveredHub[] {
  const pairedIds = new Set(paired.map((p) => p.hubId));
  return discovered.filter((d) => !pairedIds.has(d.hubId) && !d.stale);
}

/**
 * Find the paired record that matches the currently-active hub, so the
 * panel header can show "connected to X".
 */
export function findActiveRecord(
  paired: readonly HubRecord[],
  activeHubId: string | null,
): HubRecord | null {
  if (activeHubId === null) return null;
  return paired.find((p) => p.hubId === activeHubId) ?? null;
}

/**
 * Detect a FINGERPRINT_MISMATCH error from a pair-mutation failure string.
 * The main-process `formatPairError` helper returns `"FINGERPRINT_MISMATCH: …"`
 * for this case, so a simple prefix check is sufficient.
 */
export function isFingerprintMismatchError(message: string | undefined): boolean {
  if (message === undefined) return false;
  return message.startsWith('FINGERPRINT_MISMATCH');
}
