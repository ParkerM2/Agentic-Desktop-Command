/**
 * useDiscordPanel — Logic hook for DiscordPanel
 */

import { useConnectedServicePanel } from '../../hooks/useConnectedServicePanel';
import { useIntegrationsStore } from '../../store';

import type { DiscordActionType } from '../DiscordActionModal';

export function useDiscordPanel() {
  const { discordStatus } = useIntegrationsStore();

  const { status, activeAction, handleAction, handleConnect, handleCloseModal } =
    useConnectedServicePanel<typeof discordStatus, DiscordActionType>({
      status: discordStatus,
      connectedValue: 'connected',
    });

  return {
    discordStatus: status,
    activeAction,
    handleAction,
    handleConnect,
    handleCloseModal,
  };
}
