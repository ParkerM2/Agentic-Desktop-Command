/**
 * React Query mutation hooks for relay project operations
 *
 * Claim, release, and force-reclaim projects via the hub relay system.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { RELAY } from '@shared/ipc/relay/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';

import { projectKeys } from './queryKeys';

/** Claim a remote project for this device */
export function useClaimProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (projectId: string) =>
      ipc(RELAY.CLAIM.PROJECT, { projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError: onError('claim project'),
  });
}

/** Release a previously claimed project */
export function useReleaseProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (projectId: string) =>
      ipc(RELAY.RELEASE.PROJECT, { projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError: onError('release project'),
  });
}

/** Force-reclaim a project currently claimed by another device */
export function useForceReclaimProject() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (projectId: string) =>
      ipc(RELAY.RECLAIM.PROJECT, { projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError: onError('force-reclaim project'),
  });
}
