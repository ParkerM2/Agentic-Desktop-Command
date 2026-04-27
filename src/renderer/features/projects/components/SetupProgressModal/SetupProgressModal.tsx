/**
 * SetupProgressModal — Full overlay showing project setup pipeline progress.
 *
 * Listens to setup progress events via useSetupProgress and renders
 * a vertical list of steps with animated status indicators.
 */

import { AlertCircle, Check, Loader2, Minus } from 'lucide-react';

import type { SetupStep, SetupStepStatus } from '@shared/types/project-setup';

import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui';

import { useSetupProgress } from '../../hooks/useSetupProgress';

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
  const { steps, isComplete, hasErrors } = useSetupProgress(projectId);

  const hasSteps = steps.length > 0;

  function handleDone() {
    if (onComplete) {
      onComplete();
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isComplete ? 'Setup Complete' : 'Setting Up Project'}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="py-2">
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

        <DialogFooter>
          {isComplete ? (
            <Button onClick={handleDone}>Done</Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
