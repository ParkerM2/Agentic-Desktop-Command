/**
 * Unit tests for the HubPickerPanel pure derivation helpers.
 *
 * The renderer's Vitest config runs in the `node` environment, so we
 * don't mount the React component here — we exercise the pure functions
 * the component delegates to. This matches the approach used in
 * `hub-hooks.test.ts` (sibling file under tests/unit/renderer/features/hub/).
 *
 * Full component render tests require jsdom + react-testing-library,
 * which would mean new test infra — out of scope for this task per the
 * task description (reporter: ask before adding test infra).
 */

import { describe, expect, it } from 'vitest';

import {
  filterDiscovered,
  findActiveRecord,
  isFingerprintMismatchError,
  labelForPairedRowStatus,
  resolvePairedRowStatus,
} from '@renderer/features/hub/components/HubPickerPanel/derive';
import type {
  DiscoveredHub,
  HubRecord,
} from '@renderer/features/hub/components/HubPickerPanel/derive';

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

function makeDiscovered(overrides: Partial<DiscoveredHub>): DiscoveredHub {
  return {
    hubId: 'hub-d',
    displayName: 'Hub D',
    version: '0.2.0',
    channel: 'stable',
    addresses: ['192.168.1.50'],
    port: 3200,
    fingerprint: 'CC:DD',
    lastSeenAt: '2026-04-23T00:00:00.000Z',
    stale: false,
    ...overrides,
  };
}

describe('resolvePairedRowStatus', () => {
  it('returns paired-offline for records that are not the active hub', () => {
    const record = makeRecord({ hubId: 'hub-a', status: 'connected' });
    expect(resolvePairedRowStatus(record, 'hub-b')).toBe('paired-offline');
  });

  it('returns connected for the active hub when it is connected', () => {
    const record = makeRecord({ hubId: 'hub-a', status: 'connected' });
    expect(resolvePairedRowStatus(record, 'hub-a')).toBe('connected');
  });

  it('maps the active hub\'s "connecting" wire status to "reconnecting"', () => {
    const record = makeRecord({ hubId: 'hub-a', status: 'connecting' });
    expect(resolvePairedRowStatus(record, 'hub-a')).toBe('reconnecting');
  });

  it('maps the active hub\'s "error" wire status to "error"', () => {
    const record = makeRecord({ hubId: 'hub-a', status: 'error' });
    expect(resolvePairedRowStatus(record, 'hub-a')).toBe('error');
  });

  it('falls back to paired-offline when active hub has no connection yet', () => {
    const record = makeRecord({ hubId: 'hub-a', status: 'disconnected' });
    expect(resolvePairedRowStatus(record, 'hub-a')).toBe('paired-offline');
  });

  it('returns paired-offline when there is no active hub id', () => {
    const record = makeRecord({ hubId: 'hub-a', status: 'connected' });
    expect(resolvePairedRowStatus(record, null)).toBe('paired-offline');
  });
});

describe('labelForPairedRowStatus', () => {
  it('returns human-readable labels for each status', () => {
    expect(labelForPairedRowStatus('connected')).toBe('connected');
    expect(labelForPairedRowStatus('reconnecting')).toBe('reconnecting');
    expect(labelForPairedRowStatus('paired-offline')).toBe('offline');
    expect(labelForPairedRowStatus('error')).toBe('connection error');
  });
});

describe('filterDiscovered', () => {
  it('drops discovered hubs that are already paired', () => {
    const paired = [makeRecord({ hubId: 'hub-a' })];
    const discovered = [
      makeDiscovered({ hubId: 'hub-a' }),
      makeDiscovered({ hubId: 'hub-b' }),
    ];
    expect(filterDiscovered(paired, discovered).map((d) => d.hubId)).toEqual(['hub-b']);
  });

  it('drops stale discovered hubs', () => {
    const discovered = [
      makeDiscovered({ hubId: 'hub-x', stale: false }),
      makeDiscovered({ hubId: 'hub-y', stale: true }),
    ];
    expect(filterDiscovered([], discovered).map((d) => d.hubId)).toEqual(['hub-x']);
  });

  it('returns empty array when nothing remains', () => {
    const paired = [makeRecord({ hubId: 'hub-a' })];
    const discovered = [makeDiscovered({ hubId: 'hub-a' })];
    expect(filterDiscovered(paired, discovered)).toEqual([]);
  });
});

describe('findActiveRecord', () => {
  it('returns the paired record whose hubId matches activeHubId', () => {
    const paired = [
      makeRecord({ hubId: 'hub-a' }),
      makeRecord({ hubId: 'hub-b' }),
    ];
    expect(findActiveRecord(paired, 'hub-b')?.hubId).toBe('hub-b');
  });

  it('returns null when activeHubId is null', () => {
    const paired = [makeRecord({ hubId: 'hub-a' })];
    expect(findActiveRecord(paired, null)).toBeNull();
  });

  it('returns null when no paired record matches', () => {
    const paired = [makeRecord({ hubId: 'hub-a' })];
    expect(findActiveRecord(paired, 'hub-z')).toBeNull();
  });
});

describe('isFingerprintMismatchError', () => {
  it('detects the FINGERPRINT_MISMATCH prefix produced by formatPairError', () => {
    expect(isFingerprintMismatchError('FINGERPRINT_MISMATCH: expected aa got bb')).toBe(true);
  });

  it('returns false for unrelated error strings', () => {
    expect(isFingerprintMismatchError('HUB_REACHABILITY: ECONNREFUSED')).toBe(false);
    expect(isFingerprintMismatchError('network error')).toBe(false);
  });

  it('returns false when no error is provided', () => {
    const blank: string | undefined = undefined;
    expect(isFingerprintMismatchError(blank)).toBe(false);
  });
});
