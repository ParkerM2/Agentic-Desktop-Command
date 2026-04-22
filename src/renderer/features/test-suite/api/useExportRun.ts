import { useMutation } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

/** Export a run to file */
export function useExportRun() {
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({ runId, format }: { runId: string; format: 'json' | 'html' | 'csv' }) =>
      ipc(TEST_SUITE.EXPORT.FILE, { runId, format }),
    onError: onError('export run'),
  });
}
