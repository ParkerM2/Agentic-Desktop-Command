import { useMemo } from 'react';

import { buildJsonOutput } from '../../lib/format';

import type { RunRecord, StreamOutputLine } from '../../lib/types';

interface UseResultsOutputLogProps {
  displayLines: StreamOutputLine[];
  runRecord?: RunRecord | null;
}

export function useResultsOutputLog({ displayLines, runRecord }: UseResultsOutputLogProps) {
  const jsonText = useMemo(
    () => (runRecord ? buildJsonOutput(runRecord, displayLines) : '{}'),
    [runRecord, displayLines],
  );

  const hasContent = displayLines.length > 0 || runRecord !== undefined;

  return {
    jsonText,
    hasContent,
  };
}
