/**
 * useConnectedServicePanel — shared connection check + modal state + navigation.
 *
 * Extracts the identical pattern from DiscordPanel and SlackPanel:
 * check connection status, gate actions behind connected state, navigate to settings.
 */

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';

interface UseConnectedServicePanelOptions<TStatus extends string> {
  /** Current connection status from the integrations store */
  status: TStatus;
  /** The status value that indicates a connected state */
  connectedValue: TStatus;
}

export function useConnectedServicePanel<
  TStatus extends string,
  TAction extends string,
>({ status, connectedValue }: UseConnectedServicePanelOptions<TStatus>) {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<TAction | null>(null);

  function handleAction(actionType: TAction): void {
    if (status !== connectedValue) {
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
    status,
    activeAction,
    handleAction,
    handleConnect,
    handleCloseModal,
  };
}
