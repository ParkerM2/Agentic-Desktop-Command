import { useState } from 'react';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

export interface RunStep {
  stepIndex: number;
  stepLabel: string;
  timestamp: string;
  durationMs: number | null;
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

      existing.push({
        stepIndex: payload.stepIndex,
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
