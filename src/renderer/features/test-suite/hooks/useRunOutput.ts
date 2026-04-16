import { useState } from 'react';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';

interface OutputLine {
  line: string;
  timestamp: string;
}

export function useRunOutput(runId: string | null) {
  const [lines, setLines] = useState<OutputLine[]>([]);

  useIpcEvent(TEST_SUITE_EVENTS.OUTPUT.LINE, (payload) => {
    if (payload.runId === runId) {
      setLines((prev) => [...prev, { line: payload.line, timestamp: payload.timestamp }]);
    }
  });

  const clear = () => setLines([]);
  return { lines, clear };
}
