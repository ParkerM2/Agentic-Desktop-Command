import { useState } from 'react';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

export interface RunStep {
  stepIndex: number;
  stepLabel: string;
  timestamp: string;
  durationMs: number | null;
}

export function useRunSteps(runId: string | null) {
  const [steps, setSteps] = useState<RunStep[]>([]);

  useIpcEvent(TEST_SUITE_EVENTS.RUN.STEP, (payload) => {
    if (payload.runId !== runId) return;

    setSteps((prev) => {
      const updated = [...prev];

      const last = updated.at(-1);
      if (last) {
        const prevTime = new Date(last.timestamp).getTime();
        const currTime = new Date(payload.timestamp).getTime();
        updated[updated.length - 1] = { ...last, durationMs: currTime - prevTime };
      }

      updated.push({
        stepIndex: payload.stepIndex,
        stepLabel: payload.stepLabel,
        timestamp: payload.timestamp,
        durationMs: null,
      });

      return updated;
    });
  });

  const clear = () => setSteps([]);
  return { steps, clear };
}
