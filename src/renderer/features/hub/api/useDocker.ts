/**
 * React Query hooks for Docker auto-setup
 */

import { useMutation, useQuery } from '@tanstack/react-query';

import { DOCKER } from '@shared/ipc/docker/channels';

import { ipc } from '@renderer/shared/lib/ipc';

export const dockerKeys = {
  all: ['docker'] as const,
  status: () => [...dockerKeys.all, 'status'] as const,
};

/** Check if Docker Desktop is installed and running. */
export function useDockerStatus() {
  return useQuery({
    queryKey: dockerKeys.status(),
    queryFn: () => ipc(DOCKER.GET.STATUS, {}),
    staleTime: 30_000,
  });
}

/** Auto-setup Hub: pull image, start container, generate API key. */
export function useDockerSetupHub() {
  return useMutation({
    mutationFn: () => ipc(DOCKER.SETUP.HUB, {}),
  });
}

/** Reset Hub: stop/remove container + volume, then re-run setup for a fresh key. */
export function useDockerResetHub() {
  return useMutation({
    mutationFn: () => ipc(DOCKER.RESET.HUB, {}),
  });
}
