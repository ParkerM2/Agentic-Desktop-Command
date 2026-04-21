import { useMemo } from 'react';

import { useRun } from '../api/useRuns';

import { useRunOutput } from './useRunOutput';

export interface DisplayLine {
  line: string;
  timestamp: string;
}

export function useDisplayLines(runId: string | null) {
  const { lines: liveLines } = useRunOutput(runId);
  const { data: runRecord } = useRun(runId);

  const displayLines = useMemo((): DisplayLine[] => {
    if (liveLines.length > 0) return liveLines;
    if (runRecord?.outputLines && runRecord.outputLines.length > 0) {
      return runRecord.outputLines.map((line, i) => ({
        line,
        timestamp: `stored-${i}`,
      }));
    }
    return [];
  }, [liveLines, runRecord?.outputLines]);

  return displayLines;
}
