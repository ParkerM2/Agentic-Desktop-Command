/**
 * GitHubAuthSettings — GitHub CLI authorization status and connect/disconnect flow.
 *
 * Shows auth status in the Settings page. "Connect" launches `gh auth login`
 * which opens the browser device flow. Polls until auth succeeds.
 */

import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';

import { ipc } from '@renderer/shared/lib/ipc';

import { Button, Spinner } from '@ui';


// ── Icons ───────────────────────────────────────────────────

/** GitHub mark (Simple Icons) — lucide deprecated their Github icon. */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

// ── Hooks ───────────────────────────────────────────────────

function useGitHubAuth() {
  return useQuery({
    queryKey: ['app', 'githubAuth'],
    queryFn: () => ipc('app.checkGitHubAuth', {}),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ── Component ───────────────────────────────────────────────

export function GitHubAuthSettings() {
  const { data: auth, isLoading, refetch } = useGitHubAuth();
  const [authorizing, setAuthorizing] = useState(false);

  const isInstalled = auth?.installed ?? false;
  const isAuthenticated = auth?.authenticated ?? false;

  // Poll while authorizing
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

  function handleConnect() {
    setAuthorizing(true);
    void ipc('app.launchGitHubAuth', {});
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
        <Spinner className="text-muted-foreground" size="sm" />
        <span className="text-sm text-muted-foreground">Checking GitHub CLI status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitHubIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-card-foreground">GitHub</span>
          {auth?.username ? (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {auth.username}
            </code>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <XCircle className="size-3.5" />
              {isInstalled ? 'Not Connected' : 'CLI Not Installed'}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        {isAuthenticated
          ? 'GitHub is connected. ADC can access your repositories, pull requests, and issues.'
          : 'Connect GitHub to enable repository access, PR management, and issue tracking.'}
      </p>

      {/* Authorizing message */}
      {authorizing ? (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <Spinner className="text-primary" size="sm" />
          <span className="text-xs text-primary">
            Waiting for browser authorization... Authorize on the GitHub page.
          </span>
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <Button
            disabled={authorizing}
            variant="outline"
            onClick={handleConnect}
          >
            <GitHubIcon className="size-4" />
            Reconnect
          </Button>
        ) : (
          <Button
            className="bg-[#24292f] text-white hover:bg-[#24292f]/90"
            disabled={authorizing}
            onClick={handleConnect}
          >
            <GitHubIcon className="size-4" />
            Connect GitHub
          </Button>
        )}
      </div>
    </div>
  );
}
