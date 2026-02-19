/**
 * Communications event listeners
 *
 * Subscribes to Hub connection state changes and updates
 * the communications store with current service statuses.
 */

import { useIpcEvent } from '@renderer/shared/hooks';

import { useCommunicationsStore } from '../store';

export function useCommunicationsEvents() {
  const setSlackStatus = useCommunicationsStore((s) => s.setSlackStatus);
  const setDiscordStatus = useCommunicationsStore((s) => s.setDiscordStatus);

  useIpcEvent('event:hub.connectionChanged', ({ status }) => {
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
