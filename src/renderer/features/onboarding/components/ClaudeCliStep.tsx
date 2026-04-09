/**
 * ClaudeCliStep — Claude Code authorization step in the onboarding wizard.
 *
 * Shows an Authorize button immediately. Clicking it runs `claude auth login`
 * in the background, which opens the Anthropic OAuth page in the browser.
 * Auto-polls for auth completion and updates the UI.
 */

import { useEffect, useState } from 'react';

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Terminal } from 'lucide-react';

import { APP } from '@shared/ipc/app/channels';

import { useClaudeAuth } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { Button, Card, CardContent, CardHeader } from '@ui';

// ── Types ───────────────────────────────────────────────────

interface ClaudeCliStepProps {
  onNext: () => void;
  onBack: () => void;
}

// ── Main Component ───────────────────────────────────────────

export function ClaudeCliStep({ onNext, onBack }: ClaudeCliStepProps) {
  const { data: auth, refetch } = useClaudeAuth();
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = auth?.authenticated ?? false;

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

  async function handleAuthorize() {
    setError(null);
    setAuthorizing(true);
    const result = await ipc(APP.LAUNCH['CLAUDE-AUTH'], {});
    if (!result.success && !isAuthenticated) {
      setError('Authorization failed. Make sure Claude Code is installed (npm install -g @anthropic-ai/claude-code).');
      setAuthorizing(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-2 text-2xl font-bold text-foreground">Claude Code Setup</h2>
      <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
        ADC uses Claude Code to run autonomous coding agents. Authorize to connect your Anthropic
        account.
      </p>

      {/* Card */}
      <Card className="mb-5 w-full max-w-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
          <Terminal className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Claude Authorization</span>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success" />
                <span className="text-sm font-bold text-card-foreground">Authorized</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Claude Code is authorized. ADC can now launch and manage autonomous coding agents.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Click <strong>Authorize</strong> to open the Anthropic authorization page in your
                browser. Sign in and click Authorize to connect your account.
              </p>

              {authorizing ? (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2.5">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-xs text-primary">
                    Browser opened — click Authorize on the Anthropic page...
                  </span>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <Button
                className="w-full justify-center"
                disabled={authorizing}
                onClick={() => {
                  void handleAuthorize();
                }}
              >
                <Terminal className="size-4" />
                {authorizing ? 'Waiting...' : 'Authorize'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <Button onClick={onNext}>
          {isAuthenticated ? 'Continue' : 'Skip for Now'}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
