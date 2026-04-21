import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

import { Badge, Flex, Icon, Stack, Text, Tooltip, TooltipContent, TooltipTrigger } from '@ui';

import type { RunStep } from '../../hooks/useRunSteps';

interface StepTimelineProps {
  steps: RunStep[];
  runStatus: string;
}

const STEP_TYPE_LABEL: Record<string, string> = {
  navigate: 'NAV',
  click: 'CLICK',
  fill: 'FILL',
  select: 'SELECT',
  press: 'KEY',
  wait: 'WAIT',
  assert: 'ASSERT',
};

function formatDetail(label: string): string {
  // stepToLabel produces "Click selector", "Navigate → url", etc.
  // Strip the type prefix to get just the detail portion.
  const prefixes = ['Navigate → ', 'Click ', 'Fill ', 'Select ', 'Press ', 'Wait ', 'Assert '];
  for (const p of prefixes) {
    if (label.startsWith(p)) return label.slice(p.length);
  }
  return label;
}

const stepIcons = {
  passed: CheckCircle2,
  failed: XCircle,
  pending: Clock,
  running: Loader2,
};

export function StepTimeline({ steps, runStatus }: StepTimelineProps) {
  if (steps.length === 0) {
    return (
      <Flex align="center" className="h-full p-3" justify="center">
        <Text size="sm" variant="muted">
          {runStatus === 'running' ? 'Waiting for steps...' : 'Select a test to see steps'}
        </Text>
      </Flex>
    );
  }

  const maxDuration = Math.max(...steps.map((s) => s.durationMs ?? 0), 1);

  return (
    <Stack className="gap-1 overflow-y-auto p-3" gap="none">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isComplete = step.durationMs !== null;
        const barWidth = isComplete ? ((step.durationMs ?? 0) / maxDuration) * 100 : 0;
        const isSlow = (step.durationMs ?? 0) > 5000;
        const typeLabel = STEP_TYPE_LABEL[step.stepType] ?? step.stepType.toUpperCase();
        const detail = formatDetail(step.stepLabel);
        const variant = step.status ?? (isLast && runStatus === 'running' ? 'running' : 'pending');

        return (
          <Tooltip key={step.stepIndex}>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-0.5 rounded border border-border bg-bg-surface px-2 py-1.5">
                <Flex align="center" gap="sm" wrap="nowrap">
                  <Text className="w-5 shrink-0 text-right text-text-dim" size="sm">
                    {step.stepIndex + 1}
                  </Text>
                  <Badge className="shrink-0 font-mono text-[10px]" variant="outline">
                    {typeLabel}
                  </Badge>
                  <Text className="flex-1 truncate" size="sm" variant="muted">
                    {detail}
                  </Text>
                  <Icon component={stepIcons[variant]} variant={variant} />
                </Flex>
                {isComplete ? (
                  <Flex align="center" className="ml-7" gap="sm" wrap="nowrap">
                    <div className="h-1.5 flex-1 rounded-full bg-bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${isSlow ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.max(barWidth, 4)}%` }}
                      />
                    </div>
                    <Text className={`shrink-0 tabular-nums ${isSlow ? 'text-yellow-500' : ''}`} size="sm" variant="muted">
                      {step.durationMs}ms
                    </Text>
                  </Flex>
                ) : null}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <Text size="sm">
                Step {step.stepIndex + 1}: {step.stepLabel}
                {step.durationMs === null ? ' — pending' : ` — ${step.durationMs}ms`}
              </Text>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
