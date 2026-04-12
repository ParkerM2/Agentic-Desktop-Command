/**
 * Device IPC event listeners → query invalidation
 *
 * Bridges Hub WebSocket events to React Query cache for devices.
 */

import { useQueryClient } from '@tanstack/react-query';

import { HUB_EVENTS } from '@shared/ipc/hub/channels';

import { useHubEvent } from '@renderer/shared/hooks';

import { deviceKeys } from '../api/deviceQueryKeys';

/** Subscribe to hub device events and invalidate queries */
export function useDeviceEvents() {
  const queryClient = useQueryClient();

  useHubEvent(HUB_EVENTS.DEVICE.ONLINE, () => {
    void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
  });

  useHubEvent(HUB_EVENTS.DEVICE.OFFLINE, () => {
    void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
  });
}
