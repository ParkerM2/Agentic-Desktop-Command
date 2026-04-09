/**
 * useOAuthStatus — Query hook for OAuth provider configuration and auth status
 */

import { useQuery } from '@tanstack/react-query';

import { APP } from '@shared/ipc/app/channels';

import { ipc } from '@renderer/shared/lib/ipc';

export function useOAuthStatus(provider: string) {
  return useQuery({
    queryKey: ['app', 'oauthStatus', provider],
    queryFn: () => ipc(APP.CHECK['OAUTH-STATUS'], { provider }),
    staleTime: 30_000,
  });
}
