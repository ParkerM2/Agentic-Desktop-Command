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

import { Button, Card, CardContent, InlineAlert, Input, Label } from '@ui';

import { useHubConnect } from '@features/settings/api/useHub';

import { useDockerSetupHub, useDockerStatus } from '../api/useDocker';
import { validateHubUrl } from '../lib/validateHubUrl';

import type { UseMutationResult } from '@tanstack/react-query';

const DOCKER_DOWNLOAD_URL = 'https://www.docker.com/products/docker-desktop/';

// ─── Extracted sub-components ────────────────────────────────

function DockerLoading() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-2 p-6">
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
        <span className="text-muted-foreground text-sm">Checking for Docker Desktop...</span>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-success size-4" />
          <span className="text-card-foreground text-sm font-medium">
            Docker Desktop detected
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          We can automatically set up and configure the Hub server for you.
          No terminal commands required.
        </p>

        {setupMutation.isError ? (
          <InlineAlert variant="error">
            {setupMutation.error instanceof Error
              ? setupMutation.error.message
              : 'Auto setup failed'}
          </InlineAlert>
        ) : null}

        {setupMutation.data && !setupMutation.data.success ? (
          <InlineAlert variant="error">
            {setupMutation.data.error}
          </InlineAlert>
        ) : null}

        <Button
          className="w-full"
          disabled={isAutoSetupPending}
          type="button"
          onClick={onAutoSetup}
        >
          {isAutoSetupPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {autoSetupLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function DockerNotRunning({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Download className="text-warning size-4" />
          <span className="text-card-foreground text-sm font-medium">
            Docker Desktop is installed but not running
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Start Docker Desktop, then come back here. The setup button will appear
          automatically.
        </p>
        <Button className="w-full" type="button" variant="outline" onClick={onRetry}>
          Check Again
        </Button>
      </CardContent>
    </Card>
  );
}

function DockerNotInstalled({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Download className="text-muted-foreground size-4" />
          <span className="text-card-foreground text-sm font-medium">
            Docker Desktop required
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          ADC Hub runs as a Docker container on your machine. Install Docker
          Desktop (free), then come back here for automatic setup.
        </p>
        <a
          className="border-border bg-background text-card-foreground hover:bg-accent hover:text-accent-foreground inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium no-underline transition-colors"
          href={DOCKER_DOWNLOAD_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink className="size-4" />
          Download Docker Desktop
        </a>
        <Button className="w-full" type="button" variant="outline" onClick={onRetry}>
          I&apos;ve installed it — check again
        </Button>
      </CardContent>
    </Card>
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
  onSkip?: () => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- +1 from onSkip conditional render
export function HubSetupPage({ onSuccess, onNavigateToLogin, onSkip }: HubSetupPageProps) {
  const [showManual, setShowManual] = useState(false);
  const [hubUrl, setHubUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generateKeyError, setGenerateKeyError] = useState<string | null>(null);

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

  async function handleGenerateKey() {
    if (hubUrl.length === 0) {
      setGenerateKeyError('Enter the Hub URL first');
      return;
    }
    setGenerateKeyError(null);
    setIsGeneratingKey(true);
    try {
      const cleanUrl = hubUrl.replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/api/auth/generate-key`, { method: 'POST' });
      if (!response.ok) {
        const body = await response.text();
        setGenerateKeyError(`Failed (${String(response.status)}): ${body}`);
        return;
      }
      const data = (await response.json()) as { key: string };
      setApiKey(data.key);
    } catch (error) {
      setGenerateKeyError(error instanceof Error ? error.message : 'Failed to reach Hub server');
    } finally {
      setIsGeneratingKey(false);
    }
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

  const showManualConnectError =
    connectMutation.isError && validationError === null && !setupMutation.isSuccess;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="space-y-6 p-8">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
              <Server className="text-primary size-6" />
            </div>
            <h1 className="text-card-foreground text-2xl font-bold">Welcome to ADC</h1>
            <p className="text-muted-foreground text-sm">
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
          <div className="border-border border-t pt-4">
            <Button
              className="text-muted-foreground hover:text-card-foreground w-full justify-start gap-2"
              type="button"
              variant="ghost"
              onClick={() => { setShowManual(!showManual); }}
            >
              {showManual ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              I have my own Hub server
            </Button>

            {showManual ? (
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleManualConnect();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="setup-hub-url">Hub URL</Label>
                  <Input
                    autoComplete="url"
                    id="setup-hub-url"
                    placeholder="http://localhost:3200"
                    type="url"
                    value={hubUrl}
                    onChange={(e) => { setHubUrl(e.target.value); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-api-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      autoComplete="off"
                      className="flex-1"
                      id="setup-api-key"
                      placeholder="Your Hub API key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); }}
                    />
                    <Button
                      disabled={hubUrl.length === 0 || isGeneratingKey}
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => { void handleGenerateKey(); }}
                    >
                      {isGeneratingKey ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {isGeneratingKey ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                  {generateKeyError === null ? null : (
                    <InlineAlert variant="error">
                      {generateKeyError}
                    </InlineAlert>
                  )}
                </div>

                {validationError === null ? null : (
                  <InlineAlert variant="error">
                    Hub unreachable: {validationError}
                  </InlineAlert>
                )}

                {showManualConnectError ? (
                  <InlineAlert variant="error">
                    {connectMutation.error instanceof Error
                      ? connectMutation.error.message
                      : 'Connection failed. Check your URL and API key.'}
                  </InlineAlert>
                ) : null}

                <Button
                  className="w-full"
                  disabled={!isFormValid || isManualPending}
                  type="submit"
                >
                  {isManualPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  {getManualButtonLabel()}
                </Button>
              </form>
            ) : null}
          </div>

          {/* Footer links */}
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground text-sm">
              Already connected?{' '}
              <Button
                className="h-auto p-0 font-medium underline-offset-4 hover:underline"
                type="button"
                variant="link"
                onClick={onNavigateToLogin}
              >
                Sign in
              </Button>
            </p>
            {onSkip ? (
              <p className="text-muted-foreground text-sm">
                <Button
                  className="h-auto p-0 font-medium underline-offset-4 hover:underline"
                  type="button"
                  variant="link"
                  onClick={onSkip}
                >
                  Skip — use locally without Hub
                </Button>
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
