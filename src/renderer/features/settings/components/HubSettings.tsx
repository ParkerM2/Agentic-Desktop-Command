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
import { ChevronDown, ChevronRight, Cloud, CloudOff, KeyRound, RefreshCw, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { cn } from '@renderer/shared/lib/utils';

import { Button, Form, FormInput, Input, Label, Spinner } from '@ui';

import { useDockerResetHub, useDockerSetupHub, useDockerStatus } from '@features/hub/api/useDocker';
import { validateHubUrl } from '@features/hub/lib/validateHubUrl';

import {
  useHubConnect,
  useHubDisconnect,
  useHubGenerateKey,
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

interface AutoSetupPanelProps {
  onConnected: (url: string, apiKey: string) => void;
}

function AutoSetupPanel({ onConnected }: AutoSetupPanelProps) {
  const { data: dockerStatus } = useDockerStatus();
  const setupMutation = useDockerSetupHub();
  const resetMutation = useDockerResetHub();
  const [error, setError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  const docker = dockerStatus ?? { installed: false, running: false };
  const dockerReady = docker.installed && docker.running;
  const busy = setupMutation.isPending || resetMutation.isPending;

  async function handleSetup() {
    setError(null);
    setShowReset(false);
    try {
      const result = await setupMutation.mutateAsync();
      if (!result.success || !result.url || !result.apiKey) {
        setError(result.error ?? 'Setup failed.');
        if (result.step === 'api-key') {
          setShowReset(true);
        }
        return;
      }
      onConnected(result.url, result.apiKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Setup failed: ${message}`);
    }
  }

  async function handleReset() {
    setError(null);
    try {
      const result = await resetMutation.mutateAsync();
      if (!result.success || !result.url || !result.apiKey) {
        setError(result.error ?? 'Reset failed.');
        return;
      }
      setShowReset(false);
      onConnected(result.url, result.apiKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Reset failed: ${message}`);
    }
  }

  let dockerHint: string | null = null;
  if (!docker.installed) {
    dockerHint = 'Docker Desktop is not installed. Install it from docker.com, then retry.';
  } else if (!docker.running) {
    dockerHint = 'Docker Desktop is installed but not running. Start it, then retry.';
  }

  return (
    <div className="border-primary/40 bg-primary/5 space-y-3 rounded-md border p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="text-primary mt-0.5 h-5 w-5" />
        <div className="flex-1">
          <h4 className="text-foreground text-sm font-semibold">Set up Hub automatically</h4>
          <p className="text-muted-foreground text-xs">
            Pulls the Hub image, starts the container, generates an API key, and connects — no
            terminal needed.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!dockerReady || busy}
          variant="primary"
          onClick={() => {
            void handleSetup();
          }}
        >
          {setupMutation.isPending ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
          {setupMutation.isPending ? 'Setting up...' : 'Set Up Hub'}
        </Button>

        {showReset ? (
          <Button
            disabled={!dockerReady || busy}
            variant="destructive"
            onClick={() => {
              void handleReset();
            }}
          >
            {resetMutation.isPending ? <Spinner size="sm" /> : <RotateCcw className="h-4 w-4" />}
            {resetMutation.isPending ? 'Resetting...' : 'Reset Hub and try again'}
          </Button>
        ) : null}
      </div>

      {dockerHint === null ? null : <p className="text-warning-foreground text-xs">{dockerHint}</p>}
      {error === null ? null : <p className="text-destructive text-sm">{error}</p>}
      {showReset ? (
        <p className="text-muted-foreground text-xs">
          Reset wipes the existing Hub container and its data volume, then provisions a fresh Hub
          with a new API key. Use this if the existing container has a key you can&apos;t recover.
        </p>
      ) : null}
    </div>
  );
}

interface GenerateKeyPanelProps {
  hubUrl: string;
  onGenerated: (url: string, key: string) => void;
}

function GenerateKeyPanel({ hubUrl, onGenerated }: GenerateKeyPanelProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(hubUrl);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const generateMutation = useHubGenerateKey();

  // Keep the generator URL in sync with the parent URL until the user overrides it
  const [urlTouched, setUrlTouched] = useState(false);
  if (!urlTouched && url !== hubUrl) {
    setUrl(hubUrl);
  }

  async function handleGenerate() {
    setError(null);
    if (!url.trim()) {
      setError('Enter the Hub URL first.');
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        url: url.trim(),
        bootstrapSecret: secret.trim(),
      });

      if (!result.success || !result.key) {
        setError(result.error ?? 'Failed to generate key.');
        return;
      }

      setSecret('');
      onGenerated(url.trim(), result.key);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Unknown IPC channel') || message.includes('No handler')) {
        setError(
          'Main process is running older code — restart `npm run dev` so the new handler loads.',
        );
      } else {
        setError(`Request failed: ${message}`);
      }
    }
  }

  return (
    <div className="border-border rounded-md border">
      <Button
        className="w-full justify-between rounded-none p-3"
        type="button"
        variant="ghost-muted"
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <span className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Don&apos;t have an API key? Generate one
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {open ? (
        <div className="border-border space-y-3 border-t p-3">
          <p className="text-muted-foreground text-xs">
            The Hub can mint an API key for you. First-time setup usually needs no secret — leave
            the field blank. If your Hub is locked down with a{' '}
            <code className="bg-muted rounded px-1">HUB_BOOTSTRAP_SECRET</code> env var, paste its
            value below.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="gen-hub-url">Hub URL</Label>
            <Input
              id="gen-hub-url"
              placeholder="http://localhost:3200"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlTouched(true);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gen-hub-secret">
              Bootstrap Secret <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="gen-hub-secret"
              placeholder="Leave blank for first-time setup"
              type="password"
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value);
              }}
            />
          </div>

          <Button
            disabled={generateMutation.isPending}
            type="button"
            variant="secondary"
            onClick={() => {
              void handleGenerate();
            }}
          >
            {generateMutation.isPending ? <Spinner size="sm" /> : <KeyRound className="h-4 w-4" />}
            {generateMutation.isPending ? 'Generating...' : 'Generate Key'}
          </Button>

          {error === null ? null : <p className="text-destructive text-sm">{error}</p>}
        </div>
      ) : null}
    </div>
  );
}

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

      <form.Subscribe selector={(state) => [state.values.hubUrl]}>
        {([currentUrl]) => (
          <GenerateKeyPanel
            hubUrl={typeof currentUrl === 'string' ? currentUrl : ''}
            onGenerated={(url, key) => {
              form.setFieldValue('hubUrl', url);
              form.setFieldValue('apiKey', key);
            }}
          />
        )}
      </form.Subscribe>
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
        <div className="space-y-6">
          <AutoSetupPanel
            onConnected={(url, apiKey) => {
              connectMutation.mutate({ url, apiKey });
            }}
          />
          <div className="border-border border-t pt-4">
            <p className="text-muted-foreground mb-3 text-xs uppercase tracking-wide">
              Or connect manually
            </p>
            <ConnectionForm
              connectError={connectMutation.isError}
              isConnecting={connectMutation.isPending}
              onConnect={(url, apiKey) => {
                connectMutation.mutate({ url, apiKey });
              }}
            />
          </div>
        </div>
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
