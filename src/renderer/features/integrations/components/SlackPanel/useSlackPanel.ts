/**
 * useSlackPanel — Logic hook for SlackPanel
 */

import { useConnectedServicePanel } from '../../hooks/useConnectedServicePanel';
import { useIntegrationsStore } from '../../store';

import type { SlackActionType } from '../SlackActionModal';

export function useSlackPanel() {
  const { slackStatus } = useIntegrationsStore();

  const { status, activeAction, handleAction, handleConnect, handleCloseModal } =
    useConnectedServicePanel<typeof slackStatus, SlackActionType>({
      status: slackStatus,
      connectedValue: 'connected',
    });

  return {
    slackStatus: status,
    activeAction,
    handleAction,
    handleConnect,
    handleCloseModal,
  };
}
