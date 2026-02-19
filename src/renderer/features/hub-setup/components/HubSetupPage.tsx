/**
 * HubSetupPage — Pre-auth screen for first-time Hub configuration.
 *
 * Shown when no Hub URL is configured. Guides users through Docker setup
 * and validates connectivity before proceeding to login.
 */

import { useState } from 'react';

import { ArrowRight, Check, Copy, Loader2, Server, Terminal } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useHubConnect } from '@features/settings/api/useHub';

import { validateHubUrl } from '../lib/validateHubUrl';

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors';

const DOCKER_COMMAND = 'docker run -d -p 3000:3000 --name adc-hub adchub/adc-hub:latest';

interface HubSetupPageProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export function HubSetupPage({ onSuccess, onNavigateToLogin }: HubSetupPageProps) {
  const [hubUrl, setHubUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const connectMutation = useHubConnect();

  const isFormValid = hubUrl.length > 0 && apiKey.length > 0;
  const isPending = isValidating || connectMutation.isPending;

  function handleCopy() {
    void (async () => {
      await navigator.clipboard.writeText(DOCKER_COMMAND);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    })();
  }

  async function handleConnect() {
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

  function getButtonLabel(): string {
    if (isValidating) return 'Checking connection...';
    if (connectMutation.isPending) return 'Connecting...';
    return 'Connect';
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/10">
            <Server className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">Connect to ADC Hub</h1>
          <p className="text-sm text-muted-foreground">
            Configure your Hub server to get started
          </p>
        </div>

        {/* Docker instructions */}
        <div className="space-y-2 rounded-md border border-border bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <Terminal className="size-4" />
            Quick Start with Docker
          </div>
          <p className="text-xs text-muted-foreground">
            Run the following command to start a local Hub server:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-xs text-foreground">
              {DOCKER_COMMAND}
            </code>
            <button
              aria-label="Copy Docker command"
              type="button"
              className={cn(
                'shrink-0 rounded-md border border-border p-2 text-muted-foreground',
                'hover:bg-accent hover:text-accent-foreground',
              )}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-4 text-success" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Connection form */}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleConnect();
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
              placeholder="http://localhost:3000"
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
              placeholder="Enter your Hub API key"
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); }}
            />
          </div>

          {/* Errors */}
          {validationError === null ? null : (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Hub unreachable: {validationError}
            </div>
          )}

          {connectMutation.isError && validationError === null ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {connectMutation.error instanceof Error
                ? connectMutation.error.message
                : 'Connection failed. Check your URL and API key.'}
            </div>
          ) : null}

          <button
            disabled={!isFormValid || isPending}
            type="submit"
            className={cn(
              BUTTON_BASE,
              'w-full bg-primary text-primary-foreground',
              'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {getButtonLabel()}
          </button>
        </form>

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
