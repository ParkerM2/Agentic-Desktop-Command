import { useState } from 'react';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

interface OutputLine {
  line: string;
  timestamp: string;
}

interface OutputState {
  forRunId: string | null;
  lines: OutputLine[];
}

export function useRunOutput(runId: string | null) {
  const [state, setState] = useState<OutputState>({ forRunId: runId, lines: [] });

  // Derive lines synchronously — returns [] when runId changes, no effect needed
  const lines = state.forRunId === runId ? state.lines : [];

  useIpcEvent(TEST_SUITE_EVENTS.OUTPUT.LINE, (payload) => {
    if (payload.runId === runId) {
      setState((prev) => ({
        forRunId: runId,
        lines: [
          ...(prev.forRunId === runId ? prev.lines : []),
          { line: payload.line, timestamp: payload.timestamp },
        ],
      }));
    }
  });

  const clear = () => setState({ forRunId: runId, lines: [] });
  return { lines, clear };
}
