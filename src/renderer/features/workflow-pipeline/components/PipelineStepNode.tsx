/**
 * PipelineStepNode — An individual clickable step node in the pipeline diagram.
 * Shows visual state (completed, active, future, error) with icon and label.
 */

import type { ComponentType } from 'react';

import { CheckCircle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

export type StepState = 'completed' | 'active' | 'future' | 'error';

interface PipelineStepNodeProps {
  icon: ComponentType<{ className?: string }>;
  isSelected: boolean;
  label: string;
  onClick: () => void;
  state: StepState;
}

function getStateClasses(state: StepState): string {
  switch (state) {
    case 'completed': {
      return 'bg-success text-success-foreground';
    }
    case 'active': {
      return 'bg-primary/20 ring-2 ring-primary animate-pulse text-primary';
    }
    case 'future': {
      return 'bg-muted text-muted-foreground';
    }
    case 'error': {
      return 'bg-destructive/20 ring-2 ring-destructive text-destructive';
    }
  }
}

export function PipelineStepNode({
  icon,
  isSelected,
  label,
  onClick,
  state,
}: PipelineStepNodeProps) {
  const StepIcon = icon;
  const stateClasses = getStateClasses(state);
  const showCheck = state === 'completed';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-all',
          stateClasses,
          isSelected && 'ring-2 ring-ring',
        )}
        onClick={onClick}
      >
        {showCheck ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <StepIcon className="h-5 w-5" />
        )}
      </button>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
