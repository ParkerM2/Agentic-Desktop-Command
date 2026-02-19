/**
 * HubSettings — Hub connection configuration UI
 *
 * Allows users to configure the hub server URL and API key,
 * connect/disconnect, view connection status, and trigger syncs.
 */

import { useState } from 'react';

import { Cloud, CloudOff, RefreshCw, Trash2 } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Input, Label, Spinner } from '@ui';


import { validateHubUrl } from '@features/hub-setup/lib/validateHubUrl';

import {
  useHubConnect,
  useHubDisconnect,
  useHubRemoveConfig,
  useHubStatus,
  useHubSync,
} from '../api/useHub';

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

// ── Sub-components ──────────────────────────────────────────

interface ConnectionFormProps {
  isConnecting: boolean;
  connectError: boolean;
  onConnect: (url: string, apiKey: string) => void;
}

function ConnectionForm({ isConnecting, connectError, onConnect }: ConnectionFormProps) {
  const [hubUrl, setHubUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!hubUrl || !apiKey) {
      return;
    }

    // Clear previous validation error
    setValidationError(null);
    setIsValidating(true);

    // Validate hub URL before proceeding
    const validation = await validateHubUrl(hubUrl);
    setIsValidating(false);

    if (!validation.reachable) {
      setValidationError(validation.error ?? 'Hub server is unreachable');
      return;
    }

    // Validation passed, proceed with connection
    onConnect(hubUrl, apiKey);
  }

  const isPending = isConnecting || isValidating;

  function getButtonLabel(): string {
    if (isValidating) {
      return 'Validating...';
    }
    if (isConnecting) {
      return 'Connecting...';
    }
    return 'Connect';
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-1.5 block" htmlFor="hub-url">
          Hub URL
        </Label>
        <Input
          id="hub-url"
          placeholder="https://192.168.1.100:3443"
          type="url"
          value={hubUrl}
          onChange={(e) => {
            setHubUrl(e.target.value);
          }}
        />
      </div>

      <div>
        <Label className="mb-1.5 block" htmlFor="hub-api-key">
          API Key
        </Label>
        <Input
          id="hub-api-key"
          placeholder="Enter your hub API key"
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
          }}
        />
      </div>

      <Button
        disabled={!hubUrl || !apiKey || isPending}
        variant="primary"
        onClick={() => {
          void handleSubmit();
        }}
      >
        {isPending ? <Spinner size="sm" /> : <Cloud className="h-4 w-4" />}
        {getButtonLabel()}
      </Button>

      {validationError === null ? null : (
        <p className="text-destructive text-sm">
          Hub server unreachable: {validationError}. Please check the URL and try again.
        </p>
      )}

      {connectError && validationError === null ? (
        <p className="text-destructive text-sm">Failed to connect. Check your URL and API key.</p>
      ) : null}
    </div>
  );
}

interface ConnectedActionsProps {
  syncPending: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  onRemoveConfig: () => void;
}

function ConnectedActions({
  syncPending,
  onSync,
  onDisconnect,
  onRemoveConfig,
}: ConnectedActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button disabled={syncPending} variant="secondary" onClick={onSync}>
        <RefreshCw className={cn('h-4 w-4', syncPending && 'animate-spin')} />
        Sync Now
      </Button>

      <Button variant="secondary" onClick={onDisconnect}>
        <CloudOff className="h-4 w-4" />
        Disconnect
      </Button>

      <Button variant="destructive" onClick={onRemoveConfig}>
        <Trash2 className="h-4 w-4" />
        Remove Config
      </Button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────

export function HubSettings() {
  const { data: hubStatus, isLoading } = useHubStatus();
  const connectMutation = useHubConnect();
  const disconnectMutation = useHubDisconnect();
  const syncMutation = useHubSync();
  const removeConfigMutation = useHubRemoveConfig();

  const statusValue = hubStatus?.status ?? 'disconnected';
  const isConnected = statusValue === 'connected';
  const pendingCount = hubStatus?.pendingMutations ?? 0;

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
        <h3 className="text-foreground text-lg font-semibold">Hub Connection</h3>
        <p className="text-muted-foreground text-sm">
          Connect to an ADC Hub server for cross-device sync and centralized data.
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

      {/* Form or actions */}
      {isConnected ? (
        <ConnectedActions
          syncPending={syncMutation.isPending}
          onDisconnect={() => {
            disconnectMutation.mutate();
          }}
          onRemoveConfig={() => {
            removeConfigMutation.mutate();
          }}
          onSync={() => {
            syncMutation.mutate();
          }}
        />
      ) : (
        <ConnectionForm
          connectError={connectMutation.isError}
          isConnecting={connectMutation.isPending}
          onConnect={(url, apiKey) => {
            connectMutation.mutate({ url, apiKey });
          }}
        />
      )}

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
