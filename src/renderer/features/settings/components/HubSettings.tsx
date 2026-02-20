/**
 * HubSettings — Hub connection configuration UI
 *
 * Allows users to configure the hub server URL and API key,
 * connect/disconnect, view connection status, and trigger syncs.
 *
 * ConnectionForm uses TanStack Form + Zod validation.
 */

import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { Cloud, CloudOff, RefreshCw, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Form, FormInput, Spinner } from '@ui';

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

const connectionSchema = z.object({
  hubUrl: z.url('Enter a valid URL'),
  apiKey: z.string().min(1, 'API key is required'),
});

// ── Sub-components ──────────────────────────────────────────

interface ConnectionFormProps {
  isConnecting: boolean;
  connectError: boolean;
  onConnect: (url: string, apiKey: string) => void;
}

function ConnectionForm({ isConnecting, connectError, onConnect }: ConnectionFormProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      hubUrl: '',
      apiKey: '',
    },
    validators: {
      onChange: connectionSchema,
    },
    onSubmit: async ({ value }) => {
      setValidationError(null);
      setIsValidating(true);

      const validation = await validateHubUrl(value.hubUrl);
      setIsValidating(false);

      if (!validation.reachable) {
        setValidationError(validation.error ?? 'Hub server is unreachable');
        return;
      }

      onConnect(value.hubUrl, value.apiKey);
    },
  });

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

  function handleFormSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    void form.handleSubmit();
  }

  return (
    <Form className="space-y-4" onSubmit={handleFormSubmit}>
      <form.Field name="hubUrl">
        {(field) => (
          <FormInput
            required
            field={field}
            label="Hub URL"
            placeholder="https://192.168.1.100:3443"
            type="url"
          />
        )}
      </form.Field>

      <form.Field name="apiKey">
        {(field) => (
          <FormInput
            required
            field={field}
            label="API Key"
            placeholder="Enter your hub API key"
            type="password"
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit]}>
        {([canSubmit]) => (
          <Button
            disabled={!canSubmit || isPending}
            type="submit"
            variant="primary"
          >
            {isPending ? <Spinner size="sm" /> : <Cloud className="h-4 w-4" />}
            {getButtonLabel()}
          </Button>
        )}
      </form.Subscribe>

      {validationError === null ? null : (
        <p className="text-destructive text-sm">
          Hub server unreachable: {validationError}. Please check the URL and try again.
        </p>
      )}

      {connectError && validationError === null ? (
        <p className="text-destructive text-sm">Failed to connect. Check your URL and API key.</p>
      ) : null}
    </Form>
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
