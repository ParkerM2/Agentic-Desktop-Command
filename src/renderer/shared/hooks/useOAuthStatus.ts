/**
 * useOAuthStatus — Query hook for OAuth provider configuration and auth status
 */

import { useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

export function useOAuthStatus(provider: string) {
  return useQuery({
    queryKey: ['app', 'oauthStatus', provider],
    queryFn: () => ipc('app.getOAuthStatus', { provider }),
    staleTime: 30_000,
  });
}
