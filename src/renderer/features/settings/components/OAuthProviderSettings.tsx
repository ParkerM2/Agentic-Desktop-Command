/**
 * OAuthProviderSettings — Configure OAuth provider credentials
 *
 * Lists all 5 providers with connected/not-configured status.
 * Expandable form per provider to enter clientId + clientSecret.
 */

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Key, Loader2 } from 'lucide-react';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';

// ── Constants ───────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  slack: 'Slack',
  spotify: 'Spotify',
  withings: 'Withings',
};

const ICON_SIZE = 'h-4 w-4';
const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors';

// ── Types ───────────────────────────────────────────────────

interface OAuthProviderInfo {
  name: string;
  hasCredentials: boolean;
}

// ── Hooks ───────────────────────────────────────────────────

function useOAuthProviders() {
  return useQuery<OAuthProviderInfo[]>({
    queryKey: ['settings', 'oauthProviders'],
    queryFn: () => ipc('settings.getOAuthProviders', {}),
  });
}

function useSaveOAuthProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; clientId: string; clientSecret: string }) =>
      ipc('settings.setOAuthProvider', data),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'oauthProviders'] });
    },
  });
}

// ── Sub-components ──────────────────────────────────────────

interface ProviderFormProps {
  name: string;
  onSave: (clientId: string, clientSecret: string) => void;
  isPending: boolean;
}

function ProviderForm({ name, onSave, isPending }: ProviderFormProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  function handleSubmit() {
    if (clientId.length > 0 && clientSecret.length > 0) {
      onSave(clientId, clientSecret);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label
          className="text-foreground mb-1 block text-xs font-medium"
          htmlFor={`${name}-client-id`}
        >
          Client ID
        </label>
        <input
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          id={`${name}-client-id`}
          placeholder="Enter client ID"
          type="text"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
          }}
        />
      </div>
      <div>
        <label
          className="text-foreground mb-1 block text-xs font-medium"
          htmlFor={`${name}-client-secret`}
        >
          Client Secret
        </label>
        <input
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          id={`${name}-client-secret`}
          placeholder="Enter client secret"
          type="password"
          value={clientSecret}
          onChange={(e) => {
            setClientSecret(e.target.value);
          }}
        />
      </div>
      <button
        disabled={clientId.length === 0 || clientSecret.length === 0 || isPending}
        type="button"
        className={cn(
          BUTTON_BASE,
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onClick={handleSubmit}
      >
        {isPending ? (
          <Loader2 className={cn(ICON_SIZE, 'animate-spin')} />
        ) : (
          <Key className={ICON_SIZE} />
        )}
        Save Credentials
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

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
        Configure OAuth credentials for each provider. You can obtain these from each
        provider&apos;s developer console.
      </p>

      {providerList.map((provider) => {
        const isExpanded = expandedProvider === provider.name;
        const label = PROVIDER_LABELS[provider.name] ?? provider.name;

        return (
          <div key={provider.name} className="border-border rounded-lg border">
            <button
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-accent"
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
                <ProviderForm
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
