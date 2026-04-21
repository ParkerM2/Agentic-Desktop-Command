/**
 * useOAuthProviderSettings — logic hook for OAuthProviderSettings
 */

import { useState } from 'react';

import { PROVIDER_CONFIG, useOAuthProviders, useSaveOAuthProvider } from '../oauth-provider-constants';

export function useOAuthProviderSettings() {
  const { data: providers, isLoading } = useOAuthProviders();
  const saveMutation = useSaveOAuthProvider();
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  function handleSave(name: string, clientId: string, clientSecret: string) {
    saveMutation.mutate(
      { name, clientId, clientSecret },
      {
        onSuccess() {
          setExpandedProvider(null);
        },
      },
    );
  }

  return {
    providers,
    isLoading,
    saveMutation,
    expandedProvider,
    setExpandedProvider,
    PROVIDER_CONFIG,
    handleSave,
  };
}
