/**
 * HubStatus -- Compact hub connection indicator for the TopBar
 *
 * Shows a colored dot + "Hub" text indicating connection state.
 * Click navigates to the Settings page.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

import { ROUTES } from '@shared/constants';
import { HUB_EVENTS } from '@shared/ipc/hub/channels';

import { useIpcEvent } from '@renderer/shared/hooks';
import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

// eslint-disable-next-line boundaries/dependencies -- TODO: fix shared->features violation
import { hubKeys, useHubStatus } from '@features/settings/api/useHub';

// -- Types --

interface StatusConfig {
  dotClass: string;
  label: string;
  showSpinner: boolean;
}

// -- Constants --

const STATUS_MAP: Record<string, StatusConfig> = {
  connected: { dotClass: 'bg-green-500', label: 'Hub connected', showSpinner: false },
  connecting: { dotClass: 'bg-yellow-500', label: 'Connecting...', showSpinner: true },
  error: { dotClass: 'bg-red-500', label: 'Hub error', showSpinner: false },
  disconnected: { dotClass: 'bg-muted-foreground/50', label: 'Hub offline', showSpinner: false },
};

const DEFAULT_CONFIG: StatusConfig = {
  dotClass: 'bg-muted-foreground/50',
  label: 'Hub offline',
  showSpinner: false,
};

// -- Component --

export function HubStatus() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: hubStatus } = useHubStatus();

  // Real-time status updates
  useIpcEvent(HUB_EVENTS.CONNECTION.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: hubKeys.status() });
  });

  if (!hubStatus) return null;

  const statusKey = hubStatus.status;
  const config = STATUS_MAP[statusKey] ?? DEFAULT_CONFIG;

  function handleClick() {
    void navigate({ to: ROUTES.SETTINGS });
  }

  return (
    <Button
      aria-label={config.label}
      className={cn('gap-1.5 px-2 py-1 text-xs font-normal')}
      title={config.label}
      variant="ghost-muted"
      onClick={handleClick}
    >
      {config.showSpinner ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <span
          aria-hidden="true"
          className={cn('h-2 w-2 shrink-0 rounded-full', config.dotClass)}
        />
      )}
      <span>Hub</span>
    </Button>
  );
}
