/**
 * Device IPC event listeners → query invalidation
 *
 * Bridges Hub WebSocket events to React Query cache for devices.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useHubEvent } from '@renderer/shared/hooks';

import { deviceKeys } from '../api/queryKeys';

/** Subscribe to hub device events and invalidate queries */
export function useDeviceEvents() {
  const queryClient = useQueryClient();

  useHubEvent('event:hub.devices.online', () => {
    void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
  });

  useHubEvent('event:hub.devices.offline', () => {
    void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
  });
}
