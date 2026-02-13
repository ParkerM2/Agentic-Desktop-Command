/**
 * ClaudeCliStep — Check Claude CLI installation and auth status
 *
 * Uses the existing useClaudeAuth hook to verify CLI is installed and authenticated.
 */

import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, X } from 'lucide-react';

import { useClaudeAuth } from '@renderer/shared/hooks';
import { cn } from '@renderer/shared/lib/utils';

// ── Constants ───────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors';

const CLAUDE_DOCS_URL = 'https://docs.anthropic.com/en/docs/claude-code';

// ── Types ───────────────────────────────────────────────────

interface ClaudeCliStepProps {
  onNext: () => void;
  onBack: () => void;
}

// ── Helper Components ────────────────────────────────────────

interface InstructionMessageProps {
  isInstalled: boolean;
  isAuthenticated: boolean;
}

function InstructionMessage({ isInstalled, isAuthenticated }: InstructionMessageProps) {
  if (!isInstalled) {
    return (
      <div className="bg-muted/50 mt-4 rounded-md p-3">
        <p className="text-muted-foreground text-sm">
          Please install the Claude CLI to continue. Visit the documentation for installation
          instructions.
        </p>
        <a
          className="text-primary mt-2 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          href={CLAUDE_DOCS_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Installation Guide
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-muted/50 mt-4 rounded-md p-3">
        <p className="text-muted-foreground text-sm">
          Run{' '}
          <code className="text-foreground bg-muted rounded px-1.5 py-0.5 text-xs">
            claude login
          </code>{' '}
          in your terminal to authenticate.
        </p>
      </div>
    );
  }

  return null;
}

// ── Component ───────────────────────────────────────────────

export function ClaudeCliStep({ onNext, onBack }: ClaudeCliStepProps) {
  const { data: auth, isLoading, refetch } = useClaudeAuth();

  const isInstalled = auth?.installed ?? false;
  const isAuthenticated = auth?.authenticated ?? false;

  function handleRefresh() {
    void refetch();
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-foreground mb-2 text-2xl font-bold">Claude CLI Check</h2>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        The Claude CLI is required to run autonomous coding agents. Let&apos;s verify it&apos;s
        installed and authenticated.
      </p>

      {/* Status Card */}
      <div className="bg-card border-border mb-8 w-full max-w-md rounded-lg border p-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Checking Claude CLI...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Installation Status */}
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm font-medium">CLI Installed</span>
              {isInstalled ? (
                <span className="bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                  <Check className="h-3.5 w-3.5" />
                  Yes
                </span>
              ) : (
                <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                  <X className="h-3.5 w-3.5" />
                  Not Found
                </span>
              )}
            </div>

            {/* Auth Status (only if installed) */}
            {isInstalled ? (
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm font-medium">Authenticated</span>
                {isAuthenticated ? (
                  <span className="bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                    <Check className="h-3.5 w-3.5" />
                    Yes
                  </span>
                ) : (
                  <span className="bg-warning/10 text-warning inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                    <X className="h-3.5 w-3.5" />
                    Not Authenticated
                  </span>
                )}
              </div>
            ) : null}

            {/* Instructions based on status */}
            <InstructionMessage isAuthenticated={isAuthenticated} isInstalled={isInstalled} />

            {/* Refresh button */}
            <button
              type="button"
              className={cn(
                BUTTON_BASE,
                'border-border bg-background hover:bg-accent w-full justify-center border',
              )}
              onClick={handleRefresh}
            >
              Refresh Status
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          className={cn(BUTTON_BASE, 'border-border bg-background hover:bg-accent border')}
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          className={cn(BUTTON_BASE, 'bg-primary text-primary-foreground hover:bg-primary/90')}
          type="button"
          onClick={onNext}
        >
          {isAuthenticated ? 'Continue' : 'Skip for Now'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
