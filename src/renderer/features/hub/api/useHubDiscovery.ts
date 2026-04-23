/**
 * useHubDiscovery — React Query hook for the paired + discovered hub snapshot.
 *
 * Subscribes to `event:hub.discovery.changed` and pushes new snapshots into
 * the cache via `setQueryData` (no refetch). Also listens for
 * `event:hub.active.changed` so the picker reflects active-hub swaps
 * without a manual invalidation.
 */

import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { HUB, HUB_EVENTS } from '@shared/ipc/hub/channels';
import type { InvokeOutput } from '@shared/ipc-contract';

import { ipc } from '@renderer/shared/lib/ipc';

export const hubDiscoveryKeys = {
  all: ['hub', 'discovery'] as const,
  list: () => [...hubDiscoveryKeys.all, 'list'] as const,
};

type DiscoveredListSnapshot = InvokeOutput<typeof HUB.DISCOVERED.LIST>;

/**
 * Fetch the paired + discovered hub snapshot and keep it live via the
 * discovery-changed event bridge.
 */
export function useHubDiscovery() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const offDiscovery = window.api.on(HUB_EVENTS.DISCOVERY.CHANGED, (snapshot) => {
      queryClient.setQueryData<DiscoveredListSnapshot>(
        hubDiscoveryKeys.list(),
        snapshot,
      );
    });

    const offActive = window.api.on(HUB_EVENTS.ACTIVE.CHANGED, ({ activeHubId }) => {
      queryClient.setQueryData<DiscoveredListSnapshot>(
        hubDiscoveryKeys.list(),
        (prev) => (prev ? { ...prev, activeHubId } : prev),
      );
    });

    return () => {
      offDiscovery();
      offActive();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: hubDiscoveryKeys.list(),
    queryFn: () => ipc(HUB.DISCOVERED.LIST, {}),
    staleTime: Infinity,
  });
}
