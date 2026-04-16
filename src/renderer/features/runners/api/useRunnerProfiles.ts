import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { RUNNERS } from '@shared/ipc/runners/channels';
import type { RunnerProfile } from '@shared/ipc/runners/schemas';

import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';
import { ipc } from '@renderer/shared/lib/ipc';

import { runnerKeys } from './queryKeys';

export function useRunnerProfiles(projectId: string) {
  return useQuery({
    queryKey: runnerKeys.profiles(projectId),
    queryFn: () => ipc(RUNNERS.PROFILE.LIST, { projectId }),
    enabled: Boolean(projectId),
  });
}

export function useSaveRunnerProfile(projectId: string) {
  const qc = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (profile: RunnerProfile) => ipc(RUNNERS.PROFILE.SAVE, { profile }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: runnerKeys.profiles(projectId) });
    },
    onError: onError('save runner profile'),
  });
}

export function useDeleteRunnerProfile(projectId: string) {
  const qc = useQueryClient();
  const { onError } = useMutationErrorToast();
  return useMutation({
    mutationFn: (profileId: string) => ipc(RUNNERS.PROFILE.DELETE, { profileId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: runnerKeys.profiles(projectId) });
    },
    onError: onError('delete runner profile'),
  });
}

export function newRunnerProfile(projectId: string): RunnerProfile {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId,
    name: 'Dev Server',
    command: 'npm run dev',
    cwdRelative: '.',
    env: {},
    healthCheckTimeoutMs: 30_000,
    autoRestart: false,
    createdAt: now,
    updatedAt: now,
  };
}
