/**
 * HubConnectionIndicator -- Sidebar status dot for Hub connection
 *
 * Shows a colored dot indicating the Hub connection state.
 * Tooltip displays status text and Hub URL when connected.
 * Click navigates to the Settings page.
 */

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { ROUTES } from '@shared/constants';
import { HUB_EVENTS } from '@shared/ipc/hub/channels';

import { useIpcEvent } from '@renderer/shared/hooks';
import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

// eslint-disable-next-line boundaries/dependencies -- TODO: fix shared->features violation
import { useHubStatus, hubKeys } from '@features/settings/api/useHub';

// -- Types --

interface StatusConfig {
  color: string;
  label: string;
}

// -- Constants --

const STATUS_MAP: Record<string, StatusConfig> = {
  connected: { color: 'bg-green-500', label: 'Hub connected' },
  connecting: { color: 'bg-yellow-500', label: 'Connecting to Hub...' },
  error: { color: 'bg-red-500', label: 'Hub connection error' },
  disconnected: { color: 'bg-muted-foreground/50', label: 'Hub disconnected' },
};

const DEFAULT_STATUS: StatusConfig = {
  color: 'bg-muted-foreground/50',
  label: 'Hub disconnected',
};

// -- Component --

interface HubConnectionIndicatorProps {
  collapsed: boolean;
}

export function HubConnectionIndicator({ collapsed }: HubConnectionIndicatorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: hubStatus } = useHubStatus();
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Invalidate hub status on connection change events
  useIpcEvent(HUB_EVENTS.CONNECTION.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: hubKeys.status() });
  });

  const statusKey = hubStatus?.status ?? 'disconnected';
  const config = STATUS_MAP[statusKey] ?? DEFAULT_STATUS;
  const hubUrl = hubStatus?.hubUrl;

  const tooltipText = hubUrl ? `${config.label} - ${hubUrl}` : config.label;

  function handleClick() {
    void navigate({ to: ROUTES.SETTINGS });
  }

  return (
    <div className="relative">
      <Button
        aria-label={tooltipText}
        title={collapsed ? tooltipText : undefined}
        variant="ghost-muted"
        className={cn(
          'w-full gap-3 px-2.5 py-2 font-normal',
          collapsed && 'justify-center px-0',
        )}
        onClick={handleClick}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <span
          aria-hidden="true"
          className={cn('h-2.5 w-2.5 shrink-0 rounded-full', config.color)}
        />
        {collapsed ? null : <span>Hub</span>}
      </Button>

      {/* Tooltip (only when expanded, since collapsed uses native title) */}
      {!collapsed && tooltipVisible ? (
        <div
          className="bg-popover text-popover-foreground border-border pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
          role="tooltip"
        >
          {tooltipText}
        </div>
      ) : null}
    </div>
  );
}
