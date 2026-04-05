/**
 * IntegrationsStep — One-click GitHub authorization via `gh auth login`.
 *
 * Shows a Connect button for GitHub that launches the device flow auth
 * (opens browser). Polls for auth completion. Google/Slack deferred to Settings.
 */

import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { ipc } from '@renderer/shared/lib/ipc';

import { Button, Card, CardContent, CardHeader } from '@ui';

// ── Icons ───────────────────────────────────────────────────

/** GitHub mark (Simple Icons) — lucide deprecated their Github icon. */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

// ── Types ───────────────────────────────────────────────────

interface IntegrationsStepProps {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

// ── Hooks ───────────────────────────────────────────────────

function useGitHubAuth() {
  return useQuery({
    queryKey: ['app', 'githubAuth'],
    queryFn: () => ipc('app.checkGitHubAuth', {}),
    staleTime: 30_000,
  });
}

// ── Component ───────────────────────────────────────────────

export function IntegrationsStep({ onBack, onNext, onSkip }: IntegrationsStepProps) {
  const { data: ghAuth, refetch } = useGitHubAuth();
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = ghAuth?.authenticated ?? false;
  const isInstalled = ghAuth?.installed ?? false;

  // Poll for auth status while authorizing
  useEffect(() => {
    if (!authorizing) return;
    const interval = setInterval(() => {
      void refetch();
    }, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [authorizing, refetch]);

  // Stop polling once authenticated
  useEffect(() => {
    if (isAuthenticated && authorizing) {
      setAuthorizing(false);
    }
  }, [isAuthenticated, authorizing]);

  async function handleConnect() {
    setError(null);
    setAuthorizing(true);
    const result = await ipc('app.launchGitHubAuth', {});
    if (!result.success && !isAuthenticated) {
      setError(
        'GitHub authorization failed. Make sure the GitHub CLI is installed (https://cli.github.com).',
      );
      setAuthorizing(false);
    }
  }

  function renderGitHubCard() {
    if (isAuthenticated) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" />
            <span className="text-sm font-bold text-card-foreground">Connected</span>
            {ghAuth?.username ? (
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {ghAuth.username}
              </code>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            GitHub is connected. ADC can access your repositories, pull requests, and issues.
          </p>
        </div>
      );
    }

    return (
      <>
        <p className="text-sm text-muted-foreground">
          {isInstalled
            ? 'Click Connect to open the GitHub authorization page in your browser.'
            : 'Install the GitHub CLI first, then click Connect to authorize.'}
        </p>

        {authorizing ? (
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2.5">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-xs text-primary">
              Browser opened — authorize on the GitHub page...
            </span>
          </div>
        ) : null}

        {error === null ? null : (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          className="w-full justify-center bg-foreground text-background hover:bg-foreground/90"
          disabled={authorizing}
          onClick={() => {
            void handleConnect();
          }}
        >
          <GitHubIcon className="size-4" />
          {authorizing ? 'Waiting...' : 'Connect GitHub'}
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-2 text-2xl font-bold text-foreground">Integrations</h2>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        Connect your accounts to unlock additional features. You can always configure these later in
        Settings.
      </p>

      {/* GitHub Card */}
      <Card className="mb-5 w-full max-w-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
          <GitHubIcon className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">GitHub</span>
        </CardHeader>
        <CardContent className="space-y-4 p-5">{renderGitHubCard()}</CardContent>
      </Card>

      {/* Additional integrations note */}
      <p className="mb-5 max-w-md text-center text-xs text-muted-foreground">
        Google and Slack integrations can be configured in Settings.
      </p>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <Button onClick={isAuthenticated ? onNext : onSkip}>
          {isAuthenticated ? 'Continue' : 'Skip for Now'}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
