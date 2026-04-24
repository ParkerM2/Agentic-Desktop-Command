/**
 * Unit tests for the HubSetupPage pure derivation helpers.
 *
 * Mirrors the testing approach used for HubPickerPanel: the renderer's
 * Vitest config runs in the `node` environment (no jsdom), so we
 * exercise the pure `shouldShowSetup` helper rather than mounting the
 * component itself.
 */

import { describe, expect, it } from 'vitest';


import type { HUB } from '@shared/ipc/hub/channels';
import type { InvokeOutput } from '@shared/ipc-contract';

import { shouldShowSetup } from '@renderer/features/hub/components/HubSetupPage/derive';

type DiscoveredListSnapshot = InvokeOutput<typeof HUB.DISCOVERED.LIST>;
type PairedRecord = DiscoveredListSnapshot['paired'][number];

function makeRecord(overrides: Partial<PairedRecord>): PairedRecord {
  return {
    hubId: 'hub-a',
    displayName: 'Hub A',
    lastKnownUrl: 'https://hub-a.local:3200',
    pinnedFingerprint: 'AA:BB',
    addedAt: '2026-04-23T00:00:00.000Z',
    lastConnectedAt: '2026-04-23T00:00:00.000Z',
    status: 'disconnected',
    ...overrides,
  };
}

describe('shouldShowSetup', () => {
  it('shows setup when there is no active hub id', () => {
    expect(shouldShowSetup(null, [])).toBe(true);
  });

  it('shows setup when the active hub id has no matching paired record', () => {
    // e.g. config was hand-edited or a record was removed out from under us
    const paired = [makeRecord({ hubId: 'hub-b' })];
    expect(shouldShowSetup('hub-a', paired)).toBe(true);
  });

  it('forwards past setup when the active hub id matches a paired record', () => {
    const paired = [makeRecord({ hubId: 'hub-a' })];
    expect(shouldShowSetup('hub-a', paired)).toBe(false);
  });

  it('forwards past setup even when the matching record is offline', () => {
    // A paired hub that's currently disconnected still counts as "set up" —
    // the user has chosen a hub, reconnection is a runtime concern.
    const paired = [makeRecord({ hubId: 'hub-a', status: 'disconnected' })];
    expect(shouldShowSetup('hub-a', paired)).toBe(false);
  });

  it('handles an empty paired list with a phantom active hub id', () => {
    expect(shouldShowSetup('hub-ghost', [])).toBe(true);
  });
});
