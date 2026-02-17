/**
 * OAuthProviderSettings — Configure OAuth provider credentials.
 *
 * Lists all 4 providers with connected/not-configured status.
 * Expandable form per provider to enter clientId + clientSecret.
 */

import { useState } from 'react';

import { Check, ChevronDown, Loader2 } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { ICON_SIZE, PROVIDER_CONFIG, useOAuthProviders, useSaveOAuthProvider } from './oauth-provider-constants';
import { OAuthProviderForm } from './OAuthProviderForm';

export function OAuthProviderSettings() {
  const { data: providers, isLoading } = useOAuthProviders();
  const saveMutation = useSaveOAuthProvider();
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4">
        <Loader2 className={cn(ICON_SIZE, 'animate-spin')} />
        <span>Loading providers...</span>
      </div>
    );
  }

  const providerList = providers ?? [];

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Configure OAuth credentials for each provider. Click a provider to expand the setup form
        with links to the developer console and required scopes.
      </p>

      {providerList.map((provider) => {
        const isExpanded = expandedProvider === provider.name;
        const config = PROVIDER_CONFIG[provider.name];
        const label = config?.label ?? provider.name;

        return (
          <div key={provider.name} className="border-border rounded-lg border">
            <button
              aria-expanded={isExpanded}
              className="hover:bg-accent flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors"
              type="button"
              onClick={() => {
                setExpandedProvider(isExpanded ? null : provider.name);
              }}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{label}</span>
                {provider.hasCredentials ? (
                  <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                    <Check className="h-3 w-3" />
                    Configured
                  </span>
                ) : (
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                    Not configured
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'text-muted-foreground h-4 w-4 transition-transform',
                  isExpanded && 'rotate-180',
                )}
              />
            </button>

            {isExpanded ? (
              <div className="border-border border-t px-4 pb-4">
                <OAuthProviderForm
                  isPending={saveMutation.isPending}
                  name={provider.name}
                  onSave={(clientId, clientSecret) => {
                    saveMutation.mutate(
                      { name: provider.name, clientId, clientSecret },
                      {
                        onSuccess() {
                          setExpandedProvider(null);
                        },
                      },
                    );
                  }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
