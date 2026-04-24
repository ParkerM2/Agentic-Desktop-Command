import { describe, expect, it } from 'vitest';

import { shouldEnableDiscovery } from '@main/lib/hub-discovery-flag';

describe('shouldEnableDiscovery', () => {
  it('returns true when ENABLE_HUB_DISCOVERY is unset (default enabled)', () => {
    expect(shouldEnableDiscovery({})).toBe(true);
  });

  it('returns true when ENABLE_HUB_DISCOVERY=true', () => {
    expect(shouldEnableDiscovery({ ENABLE_HUB_DISCOVERY: 'true' })).toBe(true);
  });

  it('returns false when ENABLE_HUB_DISCOVERY is exactly "false"', () => {
    expect(shouldEnableDiscovery({ ENABLE_HUB_DISCOVERY: 'false' })).toBe(false);
  });

  it('returns true for non-"false" values to survive typos', () => {
    expect(shouldEnableDiscovery({ ENABLE_HUB_DISCOVERY: 'False' })).toBe(true);
    expect(shouldEnableDiscovery({ ENABLE_HUB_DISCOVERY: '0' })).toBe(true);
    expect(shouldEnableDiscovery({ ENABLE_HUB_DISCOVERY: 'no' })).toBe(true);
    expect(shouldEnableDiscovery({ ENABLE_HUB_DISCOVERY: '' })).toBe(true);
  });
});
