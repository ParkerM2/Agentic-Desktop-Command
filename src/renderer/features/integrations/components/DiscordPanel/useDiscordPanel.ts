/**
 * useDiscordPanel — Logic hook for DiscordPanel
 */

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

import { useIntegrationsStore } from '../../store';

import type { DiscordActionType } from '../DiscordActionModal';

export function useDiscordPanel() {
  const { discordStatus } = useIntegrationsStore();
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<DiscordActionType | null>(null);

  function handleAction(actionType: DiscordActionType): void {
    if (discordStatus !== 'connected') {
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
    discordStatus,
    activeAction,
    handleAction,
    handleConnect,
    handleCloseModal,
  };
}
