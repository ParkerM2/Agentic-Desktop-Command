/**
 * useSlackPanel — Logic hook for SlackPanel
 */

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { useIntegrationsStore } from '../../store';

import type { SlackActionType } from '../SlackActionModal';

export function useSlackPanel() {
  const { slackStatus } = useIntegrationsStore();
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<SlackActionType | null>(null);

  function handleAction(actionType: SlackActionType): void {
    if (slackStatus !== 'connected') {
      void navigate({ to: ROUTES.SETTINGS });
      return;
    }
    setActiveAction(actionType);
  }

  function handleConnect(): void {
    void navigate({ to: ROUTES.SETTINGS });
  }

  function handleCloseModal(): void {
    setActiveAction(null);
  }

  return {
    slackStatus,
    activeAction,
    handleAction,
    handleConnect,
    handleCloseModal,
  };
}
