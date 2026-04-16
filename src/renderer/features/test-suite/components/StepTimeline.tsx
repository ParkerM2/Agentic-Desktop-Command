import { Clock } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@ui';

import type { RunStep } from '../hooks/useRunSteps';

interface StepTimelineProps {
  steps: RunStep[];
  runStatus: string;
}

export function StepTimeline({ steps, runStatus }: StepTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        {runStatus === 'running' ? 'Waiting for steps...' : 'No step data available'}
      </div>
    );
  }

  const maxDuration = Math.max(...steps.map((s) => s.durationMs ?? 0), 1);

  return (
    <div className="flex flex-col gap-1 p-3">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isComplete = step.durationMs !== null;
        const barWidth = isComplete ? ((step.durationMs ?? 0) / maxDuration) * 100 : 0;
        const isSlow = (step.durationMs ?? 0) > 5000;

        return (
          <Tooltip key={step.stepIndex}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-xs text-text-dim">
                  {step.stepIndex + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs">{step.stepLabel}</span>
                    {isComplete ? (
                      <span
                        className={`shrink-0 text-xs ${isSlow ? 'text-yellow-500' : 'text-text-muted'}`}
                      >
                        {step.durationMs}ms
                      </span>
                    ) : null}
                    {isLast && runStatus === 'running' ? (
                      <Clock className="h-3 w-3 animate-spin text-text-muted" />
                    ) : null}
                  </div>
                  {isComplete ? (
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-bg-surface">
                      <div
                        className={`h-full rounded-full transition-all ${isSlow ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Step {step.stepIndex + 1}: {step.stepLabel}
                {step.durationMs === null ? ' \u2014 in progress' : ` \u2014 ${step.durationMs}ms`}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
