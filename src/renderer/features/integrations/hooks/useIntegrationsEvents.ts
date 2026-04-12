/**
 * Integrations event listeners
 *
 * Subscribes to Hub connection state changes and updates
 * the integrations store with current service statuses.
 */

import { HUB_EVENTS } from '@shared/ipc/hub/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { useIntegrationsStore } from '../store';

export function useIntegrationsEvents() {
  const setSlackStatus = useIntegrationsStore((s) => s.setSlackStatus);
  const setDiscordStatus = useIntegrationsStore((s) => s.setDiscordStatus);

  useIpcEvent(HUB_EVENTS.CONNECTION.CHANGED, ({ status }) => {
    if (status === 'connected') {
      setSlackStatus('connected');
      setDiscordStatus('connected');
    } else if (status === 'disconnected' || status === 'error') {
      setSlackStatus('disconnected');
      setDiscordStatus('disconnected');
    }
  });
}
