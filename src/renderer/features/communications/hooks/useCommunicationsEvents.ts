/**
 * Communications event listeners
 *
 * Subscribes to Hub connection state changes and updates
 * the communications store with current service statuses.
 */

import { HUB_EVENTS } from '@shared/ipc/hub/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { useCommunicationsStore } from '../store';

export function useCommunicationsEvents() {
  const setSlackStatus = useCommunicationsStore((s) => s.setSlackStatus);
  const setDiscordStatus = useCommunicationsStore((s) => s.setDiscordStatus);

  useIpcEvent(HUB_EVENTS.CONNECTION.CHANGED, ({ status }) => {
    // Hub connection state reflects overall service connectivity
    if (status === 'connected') {
      setSlackStatus('connected');
      setDiscordStatus('connected');
    } else if (status === 'disconnected' || status === 'error') {
      setSlackStatus('disconnected');
      setDiscordStatus('disconnected');
    }
  });
}
