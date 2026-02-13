/**
 * AuthNotification — Fixed notification when Claude CLI is missing or unauthenticated
 *
 * Renders in the bottom-left corner of the app. Dismissible per session.
 */

import { useState } from 'react';

import { AlertTriangle, ExternalLink, X } from 'lucide-react';

import { useClaudeAuth } from '@renderer/shared/hooks';

// ── Component ────────────────────────────────────────────────

export function AuthNotification() {
  const { data: auth, isLoading } = useClaudeAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isLoading || isDismissed) {
    return null;
  }

  if (!auth || auth.authenticated) {
    return null;
  }

  const isInstalled = auth.installed;

  return (
    <div className="bg-card border-border fixed bottom-4 left-4 z-50 max-w-sm rounded-lg border p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-medium">
            {isInstalled ? 'Claude CLI needs authentication' : 'Claude CLI not found'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {isInstalled
              ? 'Run "claude login" in a terminal to authenticate the Claude CLI.'
              : 'The Claude CLI is required to run autonomous agents. Install it to get started.'}
          </p>
          {isInstalled ? null : (
            <a
              className="text-primary mt-2 inline-flex items-center gap-1 text-xs hover:underline"
              href="https://docs.anthropic.com/en/docs/claude-code"
              rel="noopener noreferrer"
              target="_blank"
            >
              Learn More
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <button
          aria-label="Dismiss notification"
          className="text-muted-foreground hover:text-foreground shrink-0 p-1"
          type="button"
          onClick={() => {
            setIsDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
