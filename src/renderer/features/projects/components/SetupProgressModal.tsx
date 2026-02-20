/**
 * SetupProgressModal — Full overlay showing project setup pipeline progress.
 *
 * Listens to setup progress events via useSetupProgress and renders
 * a vertical list of steps with animated status indicators.
 */

import { useEffect } from 'react';

import { AlertCircle, Check, Loader2, Minus, X } from 'lucide-react';

import type { SetupStep, SetupStepStatus } from '@shared/types/project-setup';

import { cn } from '@renderer/shared/lib/utils';

import { useSetupProgress } from '../hooks/useSetupProgress';

interface SetupProgressModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onComplete?: () => void;
}

function getStepIcon(status: SetupStepStatus): React.ReactNode {
  if (status === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  }
  if (status === 'done') {
    return <Check className="h-4 w-4 text-success" />;
  }
  if (status === 'error') {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
  if (status === 'skipped') {
    return <Minus className="text-muted-foreground h-4 w-4" />;
  }
  // pending
  return <div className="bg-muted h-4 w-4 rounded-full" />;
}

function getStepLabelClass(status: SetupStepStatus): string {
  if (status === 'running') return 'text-foreground font-medium';
  if (status === 'done') return 'text-muted-foreground';
  if (status === 'error') return 'text-destructive font-medium';
  if (status === 'skipped') return 'text-muted-foreground line-through';
  return 'text-muted-foreground';
}

function StepRow({ step }: { step: SetupStep }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex shrink-0 items-center justify-center">
        {getStepIcon(step.status)}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', getStepLabelClass(step.status))}>{step.label}</p>
        {step.error ? (
          <p className="text-destructive mt-1 text-xs">{step.error}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SetupProgressModal({
  open,
  projectId,
  onClose,
  onComplete,
}: SetupProgressModalProps) {
  // 1. Hooks
  const { steps, isComplete, hasErrors } = useSetupProgress(projectId);

  // Escape key closes dialog
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // 2. Derived state
  const hasSteps = steps.length > 0;

  // 3. Handlers
  function handleDone() {
    if (onComplete) {
      onComplete();
    }
    onClose();
  }

  // 4. Render
  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Project setup progress"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
      />

      {/* Modal */}
      <div className="bg-card border-border relative z-10 w-full max-w-md rounded-lg border shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground text-lg font-semibold">
            {isComplete ? 'Setup Complete' : 'Setting Up Project'}
          </h2>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {hasSteps ? (
            <div className="divide-border divide-y">
              {steps.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              <span className="text-muted-foreground mt-3 text-sm">
                Preparing setup pipeline...
              </span>
              <span className="text-muted-foreground mt-1 text-xs">
                Analyzing your project and configuring tools
              </span>
            </div>
          )}

          {/* Completion status */}
          {isComplete ? (
            <div
              className={cn(
                'mt-4 rounded-md p-3',
                hasErrors ? 'bg-destructive/10' : 'bg-success/10',
              )}
            >
              <p
                className={cn(
                  'text-sm font-medium',
                  hasErrors ? 'text-destructive' : 'text-success',
                )}
              >
                {hasErrors
                  ? 'Setup completed with errors. Some steps may need manual attention.'
                  : 'All setup steps completed successfully.'}
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-4">
          {isComplete ? (
            <button
              type="button"
              className={cn(
                'bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium',
                'transition-opacity hover:opacity-90',
              )}
              onClick={handleDone}
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                'text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm',
                'transition-colors',
              )}
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
