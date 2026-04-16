/**
 * StepList
 *
 * Renders recorder step events live as they stream in from the main
 * process. Subscribes to `TEST_SUITE_EVENTS.RECORDER.STEP` and appends
 * each payload to local state.
 */

import { useState } from 'react';

import type { EventPayload } from '@shared/ipc';
import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

type StepEvent = EventPayload<typeof TEST_SUITE_EVENTS.RECORDER.STEP>;

export function StepList() {
  const [steps, setSteps] = useState<StepEvent[]>([]);

  useIpcEvent(TEST_SUITE_EVENTS.RECORDER.STEP, (payload) => {
    setSteps((prev) => [...prev, payload]);
  });

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-3 text-sm">
      {steps.map((evt) => (
        <div
          key={evt.stepIndex}
          className="flex items-start gap-2 rounded border border-border bg-bg-surface px-2 py-1"
        >
          <span className="w-6 text-xs text-text-dim">{evt.stepIndex + 1}</span>
          <span className="font-mono text-xs uppercase text-accent">{evt.step.type}</span>
          <span className="flex-1 truncate text-xs text-text-muted">{renderDetail(evt.step)}</span>
        </div>
      ))}
    </div>
  );
}

function renderDetail(step: StepEvent['step']): string {
  switch (step.type) {
    case 'navigate':
      return step.url;
    case 'click':
      return step.selector;
    case 'fill':
      return `${step.selector} → "${step.value.slice(0, 30)}"`;
    case 'select':
      return `${step.selector} → ${step.value}`;
    case 'press':
      return step.key;
    case 'wait':
      return `${String(step.ms)}ms`;
    case 'assert':
      return `${step.selector} = ${step.expected}`;
    default:
      return JSON.stringify(step);
  }
}
