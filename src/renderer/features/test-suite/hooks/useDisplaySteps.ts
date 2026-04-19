import { useMemo } from 'react';

import { useRun } from '../api/useRuns';
import { stepToLabel } from '../lib/format';

import { useRunSteps } from './useRunSteps';

import type { RunStep } from './useRunSteps';

export function useDisplaySteps(
  runId: string | null,
  scriptSteps: Array<{ type: string; [key: string]: unknown }> | undefined,
): RunStep[] {
  const { steps: liveRunSteps } = useRunSteps(runId);
  const { data: runRecord } = useRun(runId);

  return useMemo((): RunStep[] => {
    if (liveRunSteps.length > 0) return liveRunSteps;
    if (scriptSteps) {
      return scriptSteps.map((step, i) => ({
        stepIndex: i,
        stepType: step.type,
        stepLabel: stepToLabel(step),
        timestamp: runRecord?.startedAt ?? '',
        durationMs: null,
      }));
    }
    return [];
  }, [liveRunSteps, runRecord?.startedAt, scriptSteps]);
}
