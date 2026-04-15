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
  Flex,
  Stack,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ScrollArea,
  Text,
} from '@ui';

import { useTestSuiteStore } from '../store';

import type { TestSuiteStep } from '../api/useScriptMutations';


// ── Step icon mapping ────────────────────────────────────────────

type StepType = TestSuiteStep['type'];

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

function stepDescription(step: TestSuiteStep): string {
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
  steps?: TestSuiteStep[];
}

export function StepPanel({ steps: propSteps }: StepPanelProps) {
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);
  const isRecording = useTestSuiteStore((s) => s.isRecording);

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
            <Stack className="p-3" gap="sm">
              {steps.map((step, idx) => {
                const Icon = STEP_ICONS[step.type];
                const key = `${step.type}-${idx}`;
                return (
                  <Flex
                    key={key}
                    align="start"
                    className="rounded-md p-2 text-sm hover:bg-muted/50"
                  data-testid="step-item-"
                  gap="sm"
                  >
                    <Text className="w-5 shrink-0 text-xs text-muted-foreground">
                      {idx + 1}
                    </Text>
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <Stack className="min-w-0 flex-1" gap="none">
                      <Badge className="mb-0.5 text-xs" variant="outline">
                        {STEP_LABELS[step.type]}
                      </Badge>
                      <Text className="truncate text-xs text-muted-foreground">
                        {stepDescription(step)}
                      </Text>
                    </Stack>
                  </Flex>
                );
              })}
            </Stack>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
