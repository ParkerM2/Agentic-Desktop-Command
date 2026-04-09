/**
 * React Query hooks for OAuth authorization flow.
 *
 * Uses the oauth.authorize, oauth.isAuthenticated, and oauth.revoke
 * IPC channels defined in src/shared/ipc/oauth/.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OAUTH } from '@shared/ipc/oauth/channels';

import { useMutationErrorToast } from '@renderer/shared/hooks/useMutationErrorToast';
import { ipc } from '@renderer/shared/lib/ipc';

/** Query key factory for OAuth status queries */
export const oauthKeys = {
  all: ['oauth'] as const,
  status: (provider: string) => ['oauth', 'status', provider] as const,
};

/** Check if a provider is authenticated */
export function useOAuthStatus(provider: string) {
  return useQuery({
    queryKey: oauthKeys.status(provider),
    queryFn: () => ipc(OAUTH.CHECK.AUTHENTICATED, { provider }),
    enabled: provider.length > 0,
  });
}

/** Start OAuth authorization flow (opens consent window) */
export function useOAuthAuthorize() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (provider: string) => ipc(OAUTH.AUTHORIZE.PROVIDER, { provider }),
    onSuccess: (_data, provider) => {
      void queryClient.invalidateQueries({ queryKey: oauthKeys.status(provider) });
    },
    onError: onError('authorize OAuth provider'),
  });
}

/** Revoke OAuth tokens (disconnect) */
export function useOAuthRevoke() {
  const queryClient = useQueryClient();
  const { onError } = useMutationErrorToast();

  return useMutation({
    mutationFn: (provider: string) => ipc(OAUTH.REVOKE.PROVIDER, { provider }),
    onSuccess: (_data, provider) => {
      void queryClient.invalidateQueries({ queryKey: oauthKeys.status(provider) });
    },
    onError: onError('revoke OAuth provider'),
  });
}
