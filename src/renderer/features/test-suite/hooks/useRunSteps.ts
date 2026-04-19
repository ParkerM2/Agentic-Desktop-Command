import { useState } from 'react';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

export interface RunStep {
  stepIndex: number;
  stepType: string;
  stepLabel: string;
  timestamp: string;
  durationMs: number | null;
  status?: 'passed' | 'failed';
}

interface StepsState {
  forRunId: string | null;
  steps: RunStep[];
}

export function useRunSteps(runId: string | null) {
  const [state, setState] = useState<StepsState>({ forRunId: runId, steps: [] });

  const steps = state.forRunId === runId ? state.steps : [];

  useIpcEvent(TEST_SUITE_EVENTS.RUN.STEP, (payload) => {
    if (payload.runId !== runId) return;

    setState((prev) => {
      const existing = prev.forRunId === runId ? [...prev.steps] : [];

      const last = existing.at(-1);
      if (last) {
        const prevTime = new Date(last.timestamp).getTime();
        const currTime = new Date(payload.timestamp).getTime();
        existing[existing.length - 1] = { ...last, durationMs: currTime - prevTime };
      }

      // Extract type from the label prefix ("Click ...", "Navigate ...", etc.)
      const spaceIdx = payload.stepLabel.indexOf(' ');
      const parsedType = spaceIdx > 0 ? payload.stepLabel.slice(0, spaceIdx).toLowerCase() : '';

      existing.push({
        stepIndex: payload.stepIndex,
        stepType: parsedType,
        stepLabel: payload.stepLabel,
        timestamp: payload.timestamp,
        durationMs: null,
      });

      return { forRunId: runId, steps: existing };
    });
  });

  const clear = () => setState({ forRunId: runId, steps: [] });
  return { steps, clear };
}
