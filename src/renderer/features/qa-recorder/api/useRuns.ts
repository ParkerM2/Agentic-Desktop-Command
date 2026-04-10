/**
 * React Query hooks for QA run queries and mutations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QA_RECORDER } from '@shared/ipc/qa-recorder/channels';
import type { QaRunSchema } from '@shared/ipc/qa-recorder/schemas';


import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { qaRecorderKeys } from './queryKeys';

import type { z } from 'zod';

export type QaRun = z.infer<typeof QaRunSchema>;

/** Fetch all runs, optionally filtered by scriptId */
export function useRuns(scriptId?: string) {
  return useQuery({
    queryKey: scriptId ? qaRecorderKeys.runsByScript(scriptId) : qaRecorderKeys.runs(),
    queryFn: () => ipc(QA_RECORDER.LIST.RUNS, { scriptId }),
    staleTime: 10_000,
  });
}

/** Fetch a single run by id */
export function useRun(runId: string | null) {
  return useQuery({
    queryKey: qaRecorderKeys.run(runId ?? ''),
    queryFn: () => ipc(QA_RECORDER.GET.RUN, { runId: runId ?? '' }),
    enabled: runId !== null && runId.length > 0,
    staleTime: 5_000,
  });
}

/** Run a QA script */
export function useRunScript() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: ({
      scriptId,
      triggeredBy = 'manual',
    }: {
      scriptId: string;
      triggeredBy?: 'manual' | 'scheduled' | 'ci';
    }) => ipc(QA_RECORDER.RUN.SCRIPT, { scriptId, triggeredBy }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qaRecorderKeys.runs() });
    },
    onError: onError('run QA script'),
  });
}
