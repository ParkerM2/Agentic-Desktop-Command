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

  const runStatus = runRecord?.status;
  const runDurationMs = runRecord?.durationMs ?? 0;
  const stepsFailed = runRecord?.stepsFailed ?? 0;
  const totalSteps = scriptSteps?.length ?? 1;

  return useMemo((): RunStep[] => {
    if (liveRunSteps.length > 0) return liveRunSteps;
    if (scriptSteps) {
      const isComplete = runStatus === 'passed' || runStatus === 'failed';
      const failStart = totalSteps - stepsFailed;
      return scriptSteps.map((step, i) => ({
        stepIndex: i,
        stepType: step.type,
        stepLabel: stepToLabel(step),
        timestamp: runRecord?.startedAt ?? '',
        durationMs: isComplete ? Math.round(runDurationMs / totalSteps) : null,
        status: isComplete ? (i >= failStart && stepsFailed > 0 ? 'failed' : 'passed') : undefined,
      }));
    }
    return [];
  }, [liveRunSteps, runDurationMs, runRecord?.startedAt, runStatus, scriptSteps, stepsFailed, totalSteps]);
}
