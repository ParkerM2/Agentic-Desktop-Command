import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { RUNNERS } from '@shared/ipc/runners/channels';
import type { RunnerInstance, ScopeRef } from '@shared/ipc/runners/schemas';

import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';
import { ipc } from '@renderer/shared/lib/ipc';

import { runnerKeys } from './queryKeys';

export function useRunnerInstances(scope: ScopeRef) {
  return useQuery({
    queryKey: runnerKeys.instances(scope),
    queryFn: () => ipc(RUNNERS.INSTANCE.LIST, { scope }),
  });
}

export function useStartRunnerInstance(scope: ScopeRef) {
  const qc = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (profileId: string) => ipc(RUNNERS.INSTANCE.START, { profileId, scope }),
    onSuccess: (instance) => {
      qc.setQueryData<RunnerInstance[]>(runnerKeys.instances(scope), (old) => {
        const existing = old ?? [];
        if (existing.some((i) => i.id === instance.id)) return existing;
        return [...existing, instance];
      });
      void qc.invalidateQueries({ queryKey: runnerKeys.instances(scope) });
    },
    onError: onError('start runner'),
  });
}

export function useStopRunnerInstance(scope: ScopeRef) {
  const qc = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (instanceId: string) => ipc(RUNNERS.INSTANCE.STOP, { instanceId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: runnerKeys.instances(scope) });
    },
    onError: onError('stop runner'),
  });
}

export function useRestartRunnerInstance(scope: ScopeRef) {
  const qc = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (instanceId: string) => ipc(RUNNERS.INSTANCE.RESTART, { instanceId }),
    onSuccess: (instance) => {
      qc.setQueryData<RunnerInstance[]>(runnerKeys.instances(scope), (old) => {
        const existing = old ?? [];
        if (existing.some((i) => i.id === instance.id)) return existing;
        return [...existing, instance];
      });
      void qc.invalidateQueries({ queryKey: runnerKeys.instances(scope) });
    },
    onError: onError('restart runner'),
  });
}
