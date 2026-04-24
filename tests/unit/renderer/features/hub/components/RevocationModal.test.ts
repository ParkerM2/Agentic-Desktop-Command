/**
 * Unit tests for the RevocationModal pure derivation helpers.
 *
 * The renderer's Vitest config runs in the `node` environment (no DOM), so
 * we don't mount the React component here — we exercise the pure state
 * transitions and lookup helpers the component delegates to. This matches
 * the approach used by the sibling `HubPickerPanel.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import {
  INITIAL_REVOCATION_STATE,
  resolveDisplayName,
  stateOnDismiss,
  stateOnRevoked,
  type HubRecord,
  type RevocationModalState,
} from '@renderer/features/hub/components/RevocationModal/derive';

function makeRecord(overrides: Partial<HubRecord>): HubRecord {
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

describe('INITIAL_REVOCATION_STATE', () => {
  it('is closed with empty hubId and reason', () => {
    expect(INITIAL_REVOCATION_STATE).toEqual({
      open: false,
      hubId: '',
      reason: '',
    });
  });
});

describe('stateOnRevoked', () => {
  it('opens the modal with the event hubId and reason', () => {
    const next = stateOnRevoked(INITIAL_REVOCATION_STATE, {
      hubId: 'hub-a',
      reason: 'Policy violation',
    });
    expect(next).toEqual({
      open: true,
      hubId: 'hub-a',
      reason: 'Policy violation',
    });
  });

  it('replaces an already-open state with the newest revocation', () => {
    const prev: RevocationModalState = {
      open: true,
      hubId: 'hub-a',
      reason: 'old reason',
    };
    const next = stateOnRevoked(prev, {
      hubId: 'hub-b',
      reason: 'newer reason',
    });
    expect(next).toEqual({
      open: true,
      hubId: 'hub-b',
      reason: 'newer reason',
    });
  });
});

describe('stateOnDismiss', () => {
  it('returns the initial closed state', () => {
    const prev: RevocationModalState = {
      open: true,
      hubId: 'hub-a',
      reason: 'something',
    };
    expect(stateOnDismiss(prev)).toEqual(INITIAL_REVOCATION_STATE);
  });

  it('stays closed when called while already closed', () => {
    expect(stateOnDismiss(INITIAL_REVOCATION_STATE)).toEqual(INITIAL_REVOCATION_STATE);
  });
});

describe('resolveDisplayName', () => {
  it('returns the paired record displayName when hubId matches', () => {
    const paired = [
      makeRecord({ hubId: 'hub-a', displayName: 'Home Hub' }),
      makeRecord({ hubId: 'hub-b', displayName: 'Office Hub' }),
    ];
    expect(resolveDisplayName(paired, 'hub-b')).toBe('Office Hub');
  });

  it('falls back to the raw hubId when no paired record matches', () => {
    const paired = [makeRecord({ hubId: 'hub-a', displayName: 'Home Hub' })];
    expect(resolveDisplayName(paired, 'hub-zzz')).toBe('hub-zzz');
  });

  it('falls back to the raw hubId when paired list is undefined', () => {
    expect(resolveDisplayName(undefined, 'hub-a')).toBe('hub-a');
  });

  it('returns empty string when hubId is empty (initial state)', () => {
    expect(resolveDisplayName([], '')).toBe('');
  });
});

describe('state transitions — revoke then dismiss', () => {
  it('opens, updates, then closes through the full flow', () => {
    let state: RevocationModalState = INITIAL_REVOCATION_STATE;
    expect(state.open).toBe(false);

    state = stateOnRevoked(state, { hubId: 'hub-a', reason: 'revoked' });
    expect(state).toEqual({ open: true, hubId: 'hub-a', reason: 'revoked' });

    state = stateOnDismiss(state);
    expect(state).toEqual(INITIAL_REVOCATION_STATE);
  });
});
