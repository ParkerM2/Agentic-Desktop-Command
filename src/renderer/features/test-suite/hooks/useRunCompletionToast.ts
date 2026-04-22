import { useEffect, useRef } from 'react';

import { useToastStore } from '@renderer/shared/stores';

import { formatDuration } from '../lib/format';

export function useRunCompletionToast(
  status: string | undefined,
  scriptName: string | undefined,
  stepsFailed: number | undefined,
  durationMs: number | undefined,
) {
  const addToast = useToastStore((s) => s.addToast);
  const prevStatusRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!status || !scriptName) return;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prevStatus === 'running' && status === 'passed') {
      addToast(
        `${scriptName} — All tests passed (${formatDuration(durationMs ?? 0)})`,
        'success',
      );
    } else if (prevStatus === 'running' && status === 'failed') {
      addToast(
        `${scriptName} — ${stepsFailed ?? 0} step(s) failed`,
        'error',
      );
    }
  }, [status, scriptName, stepsFailed, durationMs, addToast]);
}
