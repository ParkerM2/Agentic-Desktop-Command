/**
 * AuthNotification — Fixed notification when Claude CLI is missing or unauthenticated.
 *
 * Renders in the bottom-left corner of the app. Dismissible per session.
 * Links to Settings page for re-authorization.
 */

import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ExternalLink, Settings, X } from 'lucide-react';

import { ROUTES } from '@shared/constants';

import { useClaudeAuth } from '@renderer/shared/hooks';

// ── Component ────────────────────────────────────────────────

export function AuthNotification() {
  const { data: auth, isLoading } = useClaudeAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  if (isLoading || isDismissed) {
    return null;
  }

  if (!auth || auth.authenticated) {
    return null;
  }

  const isInstalled = auth.installed;

  function handleGoToSettings() {
    void navigate({ to: ROUTES.SETTINGS });
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {isInstalled ? 'Claude Code needs authorization' : 'Claude Code not found'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isInstalled
              ? 'Autonomous agents are paused. Authorize Claude Code to resume.'
              : 'Claude Code is required to run autonomous agents.'}
          </p>
          <div className="mt-2 flex items-center gap-3">
            {isInstalled ? (
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                type="button"
                onClick={handleGoToSettings}
              >
                <Settings className="size-3" />
                Authorize in Settings
              </button>
            ) : (
              <a
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                href="https://docs.anthropic.com/en/docs/claude-code/getting-started"
                rel="noopener noreferrer"
                target="_blank"
              >
                Install Guide
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
        <button
          aria-label="Dismiss notification"
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
          type="button"
          onClick={() => {
            setIsDismissed(true);
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
