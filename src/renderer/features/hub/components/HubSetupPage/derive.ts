/**
 * HubSetupPage — pure derivation helpers.
 *
 * Kept as standalone, side-effect-free functions so they can be unit-tested
 * in the renderer's node-env Vitest config (no DOM required). The page
 * component imports these helpers.
 */

import type { HUB } from '@shared/ipc/hub/channels';
import type { InvokeOutput } from '@shared/ipc-contract';

type DiscoveredListSnapshot = InvokeOutput<typeof HUB.DISCOVERED.LIST>;
type PairedRecord = DiscoveredListSnapshot['paired'][number];

/**
 * Decide whether the first-launch HubSetupPage should show its picker +
 * Skip frame, or route past itself because the user is already set up.
 *
 * The setup page is only meaningful when the user has no paired hub that
 * could serve as the active connection. If an `activeHubId` is present
 * AND that id corresponds to a paired record, setup is done and the page
 * should short-circuit. Otherwise show the picker.
 *
 * We intentionally treat an unresolvable `activeHubId` (present but not in
 * `paired`) as "still needs setup" — the record must have been removed out
 * from under the config, and the user should be shown the picker.
 */
export function shouldShowSetup(
  activeHubId: string | null,
  paired: readonly PairedRecord[],
): boolean {
  if (activeHubId === null) return true;
  return !paired.some((p) => p.hubId === activeHubId);
}
