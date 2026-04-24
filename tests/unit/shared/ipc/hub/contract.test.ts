import { describe, it, expect } from 'vitest';

import { HUB, HUB_EVENTS } from '@shared/ipc/hub/channels';
import {
  hubDiscoveredListOutputSchema,
  hubPairRequestInputSchema,
  hubSwitchActiveInputSchema,
  hubManualPairInputSchema,
  hubDiscoveryChangedEventSchema,
  hubRevokedEventSchema,
} from '@shared/ipc/hub/contract';

describe('hub IPC channels', () => {
  it('defines all new channels', () => {
    expect(HUB.DISCOVERED.LIST).toBe('hub.discovered.list');
    expect(HUB.PAIR.REQUEST).toBe('hub.pair.request');
    expect(HUB.SWITCH.ACTIVE).toBe('hub.switch.active');
    expect(HUB.REMOVE.RECORD).toBe('hub.remove.record');
    expect(HUB.MANUAL.PAIR).toBe('hub.manual.pair');
    expect(HUB_EVENTS.DISCOVERY.CHANGED).toBe('event:hub.discovery.changed');
    expect(HUB_EVENTS.ACTIVE.CHANGED).toBe('event:hub.active.changed');
    expect(HUB_EVENTS.REVOKED).toBe('event:hub.revoked');
  });

  it('PAIR.REQUEST accepts {hubId, displayName?}', () => {
    expect(hubPairRequestInputSchema.safeParse({ hubId: 'x' }).success).toBe(true);
    expect(hubPairRequestInputSchema.safeParse({ hubId: 'x', displayName: 'y' }).success).toBe(true);
    expect(hubPairRequestInputSchema.safeParse({}).success).toBe(false);
  });

  it('DISCOVERED.LIST output includes paired + discovered + activeHubId', () => {
    const parsed = hubDiscoveredListOutputSchema.safeParse({
      paired: [],
      discovered: [],
      activeHubId: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('SWITCH.ACTIVE input requires hubId', () => {
    expect(hubSwitchActiveInputSchema.safeParse({ hubId: 'h1' }).success).toBe(true);
    expect(hubSwitchActiveInputSchema.safeParse({}).success).toBe(false);
  });

  it('MANUAL.PAIR input requires url', () => {
    expect(hubManualPairInputSchema.safeParse({ url: 'https://example.com' }).success).toBe(true);
    expect(hubManualPairInputSchema.safeParse({ url: 'not-a-url' }).success).toBe(false);
    expect(hubManualPairInputSchema.safeParse({}).success).toBe(false);
  });

  it('DISCOVERY.CHANGED event payload is typed', () => {
    const parsed = hubDiscoveryChangedEventSchema.safeParse({
      paired: [],
      discovered: [],
      activeHubId: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('REVOKED event payload has hubId + reason', () => {
    expect(hubRevokedEventSchema.safeParse({ hubId: 'x', reason: 'y' }).success).toBe(true);
    expect(hubRevokedEventSchema.safeParse({ hubId: 'x' }).success).toBe(false);
  });
});
