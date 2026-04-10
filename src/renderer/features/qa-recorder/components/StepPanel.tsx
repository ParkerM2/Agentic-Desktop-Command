/**
 * StepPanel — Left panel showing recorded steps with type icons
 */

import {
  ArrowRight,
  CheckSquare,
  Clock,
  Keyboard,
  ListOrdered,
  MousePointer,
  Navigation,
  PenLine,
} from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ScrollArea,
  Text,
} from '@ui';

import { useQaRecorderStore } from '../store';

import type { QaRecorderStep } from '../api/useScriptMutations';


// ── Step icon mapping ────────────────────────────────────────────

type StepType = QaRecorderStep['type'];

const STEP_ICONS: Record<StepType, React.ComponentType<{ className?: string }>> = {
  navigate: Navigation,
  click: MousePointer,
  fill: PenLine,
  select: ListOrdered,
  press: Keyboard,
  wait: Clock,
  assert: CheckSquare,
};

const STEP_LABELS: Record<StepType, string> = {
  navigate: 'Navigate',
  click: 'Click',
  fill: 'Fill',
  select: 'Select',
  press: 'Press',
  wait: 'Wait',
  assert: 'Assert',
};

function stepDescription(step: QaRecorderStep): string {
  switch (step.type) {
    case 'navigate':
      return step.url;
    case 'click':
      return step.selector;
    case 'fill':
      return `${step.selector} → "${step.value}"`;
    case 'select':
      return `${step.selector} → "${step.value}"`;
    case 'press':
      return step.key;
    case 'wait':
      return `${step.ms}ms`;
    case 'assert':
      return `${step.selector} = "${step.expected}"`;
  }
}

// ── Component ────────────────────────────────────────────────────

interface StepPanelProps {
  steps?: QaRecorderStep[];
}

export function StepPanel({ steps: propSteps }: StepPanelProps) {
  const recordedSteps = useQaRecorderStore((s) => s.recordedSteps);
  const isRecording = useQaRecorderStore((s) => s.isRecording);

  const steps = propSteps ?? recordedSteps;

  return (
    <Card className="flex h-full flex-col" data-testid="step-panel">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ArrowRight className="size-4" />
          Steps
          {steps.length > 0 ? (
            <Badge className="ml-auto" variant="secondary">
              {steps.length}
            </Badge>
          ) : null}
          {isRecording ? (
            <Badge className="ml-1 animate-pulse" variant="destructive">
              REC
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        {steps.length === 0 ? (
          <EmptyState
            className="h-full"
            data-testid="step-panel-empty"
            icon={ListOrdered}
            title="No steps recorded"
            description={
              isRecording
                ? 'Interact with the webview to record steps'
                : 'Start recording to capture steps'
            }
          />
        ) : (
          <ScrollArea className="h-full" data-testid="step-panel-list">
            <div className="space-y-1 p-3">
              {steps.map((step, idx) => {
                const Icon = STEP_ICONS[step.type];
                const key = `${step.type}-${idx}`;
                return (
                  <div
                    key={key}
                    className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-muted/50"
                    data-testid={`step-item-${idx}`}
                  >
                    <Text className="w-5 shrink-0 text-xs text-muted-foreground">
                      {idx + 1}
                    </Text>
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <Badge className="mb-0.5 text-xs" variant="outline">
                        {STEP_LABELS[step.type]}
                      </Badge>
                      <Text className="truncate text-xs text-muted-foreground">
                        {stepDescription(step)}
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
