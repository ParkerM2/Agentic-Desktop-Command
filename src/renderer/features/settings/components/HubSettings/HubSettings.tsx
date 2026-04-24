/**
 * HubSettings — Hub connection configuration UI.
 *
 * Renders the Spotify-style `HubPickerPanel` as the single source of
 * connection management: discovery, pair, switch, remove, manual add.
 * The legacy AutoSetup / ConnectionForm / GenerateKey panels were removed
 * in favour of the picker.
 *
 * This section still owns the top-of-page chrome: connection status dot,
 * pending-mutation counter, last-connected timestamp, and post-sync toast.
 */

import { cn } from '@renderer/shared/lib/utils';

import { Heading, Spinner } from '@ui';

import { HubPickerPanel } from '@features/hub/components/HubPickerPanel';


import { useHubSettings } from './useHubSettings';

// ── Constants ───────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  connected: 'bg-success',
  disconnected: 'bg-muted-foreground',
  connecting: 'bg-warning',
  error: 'bg-destructive',
};

const STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  error: 'Error',
};

// ── Main component ──────────────────────────────────────────

export function HubSettings() {
  const {
    hubStatus,
    isLoading,
    statusValue,
    isConnected,
    pendingCount,
    syncMutation,
  } = useHubSettings();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4">
        <Spinner className="text-muted-foreground" size="sm" />
        <span>Loading hub status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h3">Hub</Heading>
        <p className="text-muted-foreground text-sm">
          Connect to an ADC Hub for cross-device sync and centralized data.
          Discovered hubs on your network appear automatically.
        </p>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-3 w-3 rounded-full',
            STATUS_STYLES[statusValue] ?? 'bg-muted-foreground',
          )}
        />
        <span className="text-foreground text-sm font-medium">
          {STATUS_LABELS[statusValue] ?? 'Unknown'}
        </span>
        {isConnected && hubStatus?.hubUrl ? (
          <span className="text-muted-foreground text-xs">({hubStatus.hubUrl})</span>
        ) : null}
      </div>

      {/* Pending mutations */}
      {pendingCount > 0 ? (
        <div className="border-warning bg-warning-light rounded-md border p-3">
          <p className="text-warning-foreground text-sm">
            {String(pendingCount)} pending mutation{pendingCount === 1 ? '' : 's'} waiting to sync.
          </p>
        </div>
      ) : null}

      {/* Last connected */}
      {hubStatus?.lastConnected ? (
        <p className="text-muted-foreground text-xs">
          Last connected: {new Date(hubStatus.lastConnected).toLocaleString()}
        </p>
      ) : null}

      {/* Picker — handles connect, switch, remove, manual add */}
      <HubPickerPanel />

      {/* Sync result */}
      {syncMutation.isSuccess ? (
        <p className="text-success text-sm">
          Synced {String(syncMutation.data.syncedCount)} item
          {syncMutation.data.syncedCount === 1 ? '' : 's'}.
          {syncMutation.data.pendingCount > 0
            ? ` ${String(syncMutation.data.pendingCount)} still pending.`
            : ''}
        </p>
      ) : null}
    </div>
  );
}
