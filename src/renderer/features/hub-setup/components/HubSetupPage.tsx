/**
 * HubSetupPage — Pre-auth screen for first-time Hub configuration.
 *
 * Auto-detects Docker Desktop and offers one-click Hub setup.
 * Falls back to manual URL + API key entry for advanced users.
 */

import { useState } from 'react';

import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Server,
  Sparkles,
} from 'lucide-react';


import { cn } from '@renderer/shared/lib/utils';

import { useHubConnect } from '@features/settings/api/useHub';

import { useDockerSetupHub, useDockerStatus } from '../api/useDocker';
import { validateHubUrl } from '../lib/validateHubUrl';

import type { UseMutationResult } from '@tanstack/react-query';

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors';

const DOCKER_DOWNLOAD_URL = 'https://www.docker.com/products/docker-desktop/';

// ─── Extracted sub-components ────────────────────────────────

function DockerLoading() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-muted/50 p-6">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Checking for Docker Desktop...</span>
    </div>
  );
}

interface DockerReadyProps {
  setupMutation: UseMutationResult<
    { success: boolean; url?: string; apiKey?: string; error?: string; step?: string },
    Error,
    void
  >;
  isAutoSetupPending: boolean;
  autoSetupLabel: string;
  onAutoSetup: () => void;
}

function DockerReady({ setupMutation, isAutoSetupPending, autoSetupLabel, onAutoSetup }: DockerReadyProps) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-success" />
        <span className="text-sm font-medium text-card-foreground">
          Docker Desktop detected
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        We can automatically set up and configure the Hub server for you.
        No terminal commands required.
      </p>

      {setupMutation.isError ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {setupMutation.error instanceof Error
            ? setupMutation.error.message
            : 'Auto setup failed'}
        </div>
      ) : null}

      {setupMutation.data && !setupMutation.data.success ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {setupMutation.data.error}
        </div>
      ) : null}

      <button
        disabled={isAutoSetupPending}
        type="button"
        className={cn(
          BUTTON_BASE,
          'w-full bg-primary text-primary-foreground',
          'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onClick={onAutoSetup}
      >
        {isAutoSetupPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {autoSetupLabel}
      </button>
    </div>
  );
}

function DockerNotRunning({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <Download className="size-4 text-warning" />
        <span className="text-sm font-medium text-card-foreground">
          Docker Desktop is installed but not running
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Start Docker Desktop, then come back here. The setup button will appear
        automatically.
      </p>
      <button
        type="button"
        className={cn(
          BUTTON_BASE,
          'w-full border border-border bg-background text-card-foreground',
          'hover:bg-accent hover:text-accent-foreground',
        )}
        onClick={onRetry}
      >
        Check Again
      </button>
    </div>
  );
}

function DockerNotInstalled({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <Download className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-card-foreground">
          Docker Desktop required
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        ADC Hub runs as a Docker container on your machine. Install Docker
        Desktop (free), then come back here for automatic setup.
      </p>
      <a
        href={DOCKER_DOWNLOAD_URL}
        rel="noopener noreferrer"
        target="_blank"
        className={cn(
          BUTTON_BASE,
          'w-full border border-border bg-background text-card-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'no-underline',
        )}
      >
        <ExternalLink className="size-4" />
        Download Docker Desktop
      </a>
      <button
        type="button"
        className={cn(
          BUTTON_BASE,
          'w-full border border-border bg-transparent text-muted-foreground',
          'hover:bg-accent hover:text-accent-foreground',
        )}
        onClick={onRetry}
      >
        I&apos;ve installed it — check again
      </button>
    </div>
  );
}

// ─── Docker status resolver ──────────────────────────────────

interface DockerSectionProps {
  isLoading: boolean;
  isRunning: boolean;
  isInstalled: boolean;
  setupMutation: DockerReadyProps['setupMutation'];
  isAutoSetupPending: boolean;
  autoSetupLabel: string;
  onAutoSetup: () => void;
  onRetry: () => void;
}

function DockerSection({
  isLoading,
  isRunning,
  isInstalled,
  setupMutation,
  isAutoSetupPending,
  autoSetupLabel,
  onAutoSetup,
  onRetry,
}: DockerSectionProps) {
  if (isLoading) return <DockerLoading />;
  if (isRunning) {
    return (
      <DockerReady
        autoSetupLabel={autoSetupLabel}
        isAutoSetupPending={isAutoSetupPending}
        setupMutation={setupMutation}
        onAutoSetup={onAutoSetup}
      />
    );
  }
  if (isInstalled) return <DockerNotRunning onRetry={onRetry} />;
  return <DockerNotInstalled onRetry={onRetry} />;
}

// ─── Main page component ─────────────────────────────────────

interface HubSetupPageProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export function HubSetupPage({ onSuccess, onNavigateToLogin }: HubSetupPageProps) {
  const [showManual, setShowManual] = useState(false);
  const [hubUrl, setHubUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const dockerStatus = useDockerStatus();
  const setupMutation = useDockerSetupHub();
  const connectMutation = useHubConnect();

  const isFormValid = hubUrl.length > 0 && apiKey.length > 0;
  const isManualPending = isValidating || connectMutation.isPending;
  const isAutoSetupPending = setupMutation.isPending || (connectMutation.isPending && setupMutation.isSuccess);

  function handleAutoSetup() {
    setupMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success && result.url && result.apiKey) {
          connectMutation.mutate(
            { url: result.url, apiKey: result.apiKey },
            { onSuccess },
          );
        }
      },
    });
  }

  async function handleManualConnect() {
    if (!isFormValid) return;

    setValidationError(null);
    setIsValidating(true);

    const validation = await validateHubUrl(hubUrl);
    setIsValidating(false);

    if (!validation.reachable) {
      setValidationError(validation.error ?? 'Hub server is unreachable');
      return;
    }

    connectMutation.mutate(
      { url: hubUrl, apiKey },
      { onSuccess },
    );
  }

  function getAutoSetupLabel(): string {
    if (setupMutation.isPending) return 'Setting up Hub...';
    if (connectMutation.isPending && setupMutation.isSuccess) return 'Connecting...';
    return 'Set Up Hub Automatically';
  }

  function getManualButtonLabel(): string {
    if (isValidating) return 'Checking connection...';
    if (connectMutation.isPending && !setupMutation.isSuccess) return 'Connecting...';
    return 'Connect';
  }

  const chevronIcon = showManual
    ? <ChevronDown className="size-4" />
    : <ChevronRight className="size-4" />;

  const showManualConnectError =
    connectMutation.isError && validationError === null && !setupMutation.isSuccess;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <Server className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">Welcome to ADC</h1>
          <p className="text-sm text-muted-foreground">
            ADC Hub is your personal server that syncs tasks, projects, and agent
            activity across devices. Let&apos;s get it running.
          </p>
        </div>

        {/* Docker auto-setup section */}
        <DockerSection
          autoSetupLabel={getAutoSetupLabel()}
          isAutoSetupPending={isAutoSetupPending}
          isInstalled={dockerStatus.data?.installed === true}
          isLoading={dockerStatus.isLoading}
          isRunning={dockerStatus.data?.running === true}
          setupMutation={setupMutation}
          onAutoSetup={handleAutoSetup}
          onRetry={() => { void dockerStatus.refetch(); }}
        />

        {/* Manual connection — collapsible for advanced users */}
        <div className="border-t border-border pt-4">
          <button
            className="flex w-full items-center gap-2 text-sm text-muted-foreground hover:text-card-foreground"
            type="button"
            onClick={() => { setShowManual(!showManual); }}
          >
            {chevronIcon}
            I have my own Hub server
          </button>

          {showManual ? (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleManualConnect();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground" htmlFor="setup-hub-url">
                  Hub URL
                </label>
                <input
                  autoComplete="url"
                  className={INPUT_CLASS}
                  id="setup-hub-url"
                  placeholder="http://localhost:3200"
                  type="url"
                  value={hubUrl}
                  onChange={(e) => { setHubUrl(e.target.value); }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground" htmlFor="setup-api-key">
                  API Key
                </label>
                <input
                  autoComplete="off"
                  className={INPUT_CLASS}
                  id="setup-api-key"
                  placeholder="Your Hub API key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); }}
                />
              </div>

              {validationError === null ? null : (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Hub unreachable: {validationError}
                </div>
              )}

              {showManualConnectError ? (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {connectMutation.error instanceof Error
                    ? connectMutation.error.message
                    : 'Connection failed. Check your URL and API key.'}
                </div>
              ) : null}

              <button
                disabled={!isFormValid || isManualPending}
                type="submit"
                className={cn(
                  BUTTON_BASE,
                  'w-full bg-primary text-primary-foreground',
                  'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {isManualPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {getManualButtonLabel()}
              </button>
            </form>
          ) : null}
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground">
          Already connected?{' '}
          <button
            className="font-medium text-primary underline-offset-4 hover:underline"
            type="button"
            onClick={onNavigateToLogin}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
