import type { RefObject } from 'react';

import { Text } from '@ui';

import { getOutputLineClass } from '../lib/format';

interface ResultsOutputLogProps {
  displayLines: Array<{ line: string; timestamp: string }>;
  outputRef: RefObject<HTMLDivElement | null>;
  activeRunId: string | null;
  errorMessage?: string;
}

export function ResultsOutputLog({
  displayLines,
  outputRef,
  activeRunId,
  errorMessage,
}: ResultsOutputLogProps) {
  return (
    <div ref={outputRef} className="flex-1 overflow-y-auto bg-bg-surface p-3">
      {errorMessage ? (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
      <pre className="font-mono text-xs whitespace-pre-wrap">
        {displayLines.length > 0 ? (
          displayLines.map((l, i) => (
            <div
              key={l.timestamp === `stored-${i}` ? `stored-${i}` : l.timestamp}
              className={getOutputLineClass(l.line)}
            >
              {l.line}
            </div>
          ))
        ) : (
          <Text size="sm" variant="muted">
            {activeRunId ? 'No output captured for this run.' : 'Run a test to see output here.'}
          </Text>
        )}
      </pre>
    </div>
  );
}
