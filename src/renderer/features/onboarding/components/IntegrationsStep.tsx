/**
 * IntegrationsStep — Optional OAuth provider setup
 *
 * Lists available integrations with "Set up later" skip option.
 */

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Key,
  Loader2,
} from 'lucide-react';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';

// ── Constants ───────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors';

interface ProviderConfig {
  label: string;
  consoleUrl: string;
  consoleName: string;
}

const PROVIDER_CONFIG: Partial<Record<string, ProviderConfig>> = {
  github: {
    label: 'GitHub',
    consoleUrl: 'https://github.com/settings/developers',
    consoleName: 'GitHub Developer Settings',
  },
  google: {
    label: 'Google',
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    consoleName: 'Google Cloud Console',
  },
  slack: {
    label: 'Slack',
    consoleUrl: 'https://api.slack.com/apps',
    consoleName: 'Slack API Portal',
  },
};

// ── Types ───────────────────────────────────────────────────

interface IntegrationsStepProps {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

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

interface ProviderItemProps {
  isExpanded: boolean;
  isPending: boolean;
  provider: OAuthProviderInfo;
  onSave: (clientId: string, clientSecret: string) => void;
  onToggle: () => void;
}

function ProviderItem({ isExpanded, isPending, provider, onSave, onToggle }: ProviderItemProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState<string | null>(null);

  const config = PROVIDER_CONFIG[provider.name];
  const label = config?.label ?? provider.name;

  function handleSave() {
    if (clientId.trim().length < 10) {
      setError('Client ID appears too short');
      return;
    }
    if (clientSecret.trim().length < 10) {
      setError('Client Secret appears too short');
      return;
    }
    setError(null);
    onSave(clientId.trim(), clientSecret.trim());
  }

  return (
    <div className="border-border rounded-lg border">
      <button
        aria-expanded={isExpanded}
        className="hover:bg-accent flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors"
        type="button"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-foreground font-medium">{label}</span>
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
        <div className="border-border space-y-4 border-t px-4 py-4">
          {config === undefined ? null : (
            <a
              className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              href={config.consoleUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open {config.consoleName}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <div>
            <label
              className="text-foreground mb-1 block text-xs font-medium"
              htmlFor={`${provider.name}-client-id`}
            >
              Client ID
            </label>
            <input
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              id={`${provider.name}-client-id`}
              placeholder="Enter client ID"
              type="text"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setError(null);
              }}
            />
          </div>

          <div>
            <label
              className="text-foreground mb-1 block text-xs font-medium"
              htmlFor={`${provider.name}-client-secret`}
            >
              Client Secret
            </label>
            <input
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              id={`${provider.name}-client-secret`}
              placeholder="Enter client secret"
              type="password"
              value={clientSecret}
              onChange={(e) => {
                setClientSecret(e.target.value);
                setError(null);
              }}
            />
          </div>

          {error === null ? null : (
            <p className="text-destructive flex items-center gap-1.5 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <button
            disabled={isPending}
            type="button"
            className={cn(
              BUTTON_BASE,
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            onClick={handleSave}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────

export function IntegrationsStep({ onBack, onNext, onSkip }: IntegrationsStepProps) {
  const { data: providers, isLoading } = useOAuthProviders();
  const saveMutation = useSaveOAuthProvider();
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Filter to show only main providers
  const mainProviders = (providers ?? []).filter((p) =>
    ['github', 'google', 'slack'].includes(p.name),
  );

  const configuredCount = mainProviders.filter((p) => p.hasCredentials).length;

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-foreground mb-2 text-2xl font-bold">Integrations</h2>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        Connect your favorite services to unlock additional features. You can always configure these
        later in Settings.
      </p>

      {/* Provider List */}
      <div className="bg-card border-border mb-8 w-full max-w-md rounded-lg border p-4">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading integrations...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {mainProviders.map((provider) => (
              <ProviderItem
                key={provider.name}
                isExpanded={expandedProvider === provider.name}
                isPending={saveMutation.isPending}
                provider={provider}
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
                onToggle={() => {
                  setExpandedProvider(expandedProvider === provider.name ? null : provider.name);
                }}
              />
            ))}
          </div>
        )}

        {configuredCount > 0 ? (
          <p className="text-muted-foreground mt-4 text-center text-sm">
            {configuredCount} of {mainProviders.length} integrations configured
          </p>
        ) : null}
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          className={cn(BUTTON_BASE, 'border-border bg-background hover:bg-accent border')}
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          className={cn(BUTTON_BASE, 'border-border bg-background hover:bg-accent border')}
          type="button"
          onClick={onSkip}
        >
          Set Up Later
        </button>

        <button
          className={cn(BUTTON_BASE, 'bg-primary text-primary-foreground hover:bg-primary/90')}
          type="button"
          onClick={onNext}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
