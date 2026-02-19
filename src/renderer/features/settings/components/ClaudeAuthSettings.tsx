/**
 * ClaudeAuthSettings — Claude Code authorization status and re-auth flow.
 *
 * Shows auth status in the Settings page. "Authorize" / "Re-authorize"
 * launches `claude auth login` which opens the browser OAuth flow.
 * Polls until auth succeeds. If auth drops, user can re-authorize
 * and restart paused agents.
 */

import { useEffect, useState } from 'react';

import { CheckCircle2, Terminal, XCircle } from 'lucide-react';


import { useClaudeAuth } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { Button, Spinner } from '@ui';

// ── Component ───────────────────────────────────────────────

export function ClaudeAuthSettings() {
  const { data: auth, isLoading, refetch } = useClaudeAuth();
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

  function handleAuthorize() {
    setAuthorizing(true);
    void ipc('app.launchClaudeAuth', {});
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
        <Spinner className="text-muted-foreground" size="sm" />
        <span className="text-sm text-muted-foreground">Checking Claude Code status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-card-foreground">Claude Code</span>
          {auth?.version ? (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {auth.version}
            </code>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" />
              Authorized
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <XCircle className="size-3.5" />
              {isInstalled ? 'Not Authorized' : 'Not Installed'}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">
        {isAuthenticated
          ? 'Claude Code is authorized and can launch autonomous coding agents.'
          : 'Authorize Claude Code to enable autonomous coding agents. This opens the Anthropic authorization page in your browser.'}
      </p>

      {/* Authorizing message */}
      {authorizing ? (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <Spinner className="text-primary" size="sm" />
          <span className="text-xs text-primary">
            Waiting for browser authorization... Click Authorize in your browser.
          </span>
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <Button
            disabled={authorizing}
            variant="outline"
            onClick={handleAuthorize}
          >
            <Terminal className="size-4" />
            Re-authorize
          </Button>
        ) : (
          <Button
            disabled={!isInstalled || authorizing}
            variant="primary"
            onClick={handleAuthorize}
          >
            <Terminal className="size-4" />
            Authorize
          </Button>
        )}
      </div>
    </div>
  );
}
