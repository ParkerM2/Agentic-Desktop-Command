/**
 * OAuthProviderSettings — Configure OAuth provider credentials
 *
 * Lists all 4 providers with connected/not-configured status.
 * Expandable form per provider to enter clientId + clientSecret.
 * Includes validation, developer console links, and required scopes.
 */

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ChevronDown, ExternalLink, Key, Loader2 } from 'lucide-react';

import { ipc } from '@renderer/shared/lib/ipc';
import { cn } from '@renderer/shared/lib/utils';

// ── Constants ───────────────────────────────────────────────

interface ProviderConfig {
  label: string;
  consoleUrl: string;
  consoleName: string;
  requiredScopes: string[];
  scopeDescription: string;
}

const PROVIDER_CONFIG: Partial<Record<string, ProviderConfig>> = {
  github: {
    label: 'GitHub',
    consoleUrl: 'https://github.com/settings/developers',
    consoleName: 'GitHub Developer Settings',
    requiredScopes: ['repo', 'read:user', 'user:email'],
    scopeDescription: 'Repository access, read user profile, and email',
  },
  google: {
    label: 'Google',
    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
    consoleName: 'Google Cloud Console',
    requiredScopes: ['openid', 'email', 'profile'],
    scopeDescription: 'Basic profile information and email',
  },
  slack: {
    label: 'Slack',
    consoleUrl: 'https://api.slack.com/apps',
    consoleName: 'Slack API Portal',
    requiredScopes: ['openid', 'profile', 'email'],
    scopeDescription: 'User identity, profile, and email (Sign in with Slack)',
  },
  spotify: {
    label: 'Spotify',
    consoleUrl: 'https://developer.spotify.com/dashboard',
    consoleName: 'Spotify Developer Dashboard',
    requiredScopes: ['user-read-email', 'user-read-private'],
    scopeDescription: 'Read user email and profile information',
  },
};

const ICON_SIZE = 'h-4 w-4';
const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors';

// ── Types ───────────────────────────────────────────────────

interface OAuthProviderInfo {
  name: string;
  hasCredentials: boolean;
}

interface ValidationState {
  clientIdError: string | null;
  clientSecretError: string | null;
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

// ── Validation ──────────────────────────────────────────────

function validateCredentials(clientId: string, clientSecret: string): ValidationState {
  const state: ValidationState = {
    clientIdError: null,
    clientSecretError: null,
  };

  const trimmedId = clientId.trim();
  const trimmedSecret = clientSecret.trim();

  if (trimmedId.length === 0) {
    state.clientIdError = 'Client ID is required';
  } else if (trimmedId.length < 10) {
    state.clientIdError = 'Client ID appears too short';
  }

  if (trimmedSecret.length === 0) {
    state.clientSecretError = 'Client Secret is required';
  } else if (trimmedSecret.length < 10) {
    state.clientSecretError = 'Client Secret appears too short';
  }

  return state;
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
  const [validation, setValidation] = useState<ValidationState>({
    clientIdError: null,
    clientSecretError: null,
  });
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const config = PROVIDER_CONFIG[name];

  function handleSubmit() {
    setHasAttemptedSubmit(true);
    const validationResult = validateCredentials(clientId, clientSecret);
    setValidation(validationResult);

    if (validationResult.clientIdError === null && validationResult.clientSecretError === null) {
      onSave(clientId.trim(), clientSecret.trim());
    }
  }

  function handleClientIdChange(value: string) {
    setClientId(value);
    if (hasAttemptedSubmit) {
      const result = validateCredentials(value, clientSecret);
      setValidation((prev) => ({ ...prev, clientIdError: result.clientIdError }));
    }
  }

  function handleClientSecretChange(value: string) {
    setClientSecret(value);
    if (hasAttemptedSubmit) {
      const result = validateCredentials(clientId, value);
      setValidation((prev) => ({ ...prev, clientSecretError: result.clientSecretError }));
    }
  }

  const showClientIdError = hasAttemptedSubmit && validation.clientIdError !== null;
  const showClientSecretError = hasAttemptedSubmit && validation.clientSecretError !== null;

  return (
    <div className="mt-3 space-y-4">
      {/* Developer Console Link */}
      {config ? (
        <div className="bg-muted/50 rounded-md p-3">
          <a
            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            href={config.consoleUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open {config.consoleName}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="text-muted-foreground mt-1 text-xs">
            Create an OAuth app and copy the credentials below.
          </p>
        </div>
      ) : null}

      {/* Required Scopes */}
      {config ? (
        <div className="bg-info/5 border-info/20 rounded-md border p-3">
          <p className="text-info text-xs font-medium">Required Scopes:</p>
          <p className="text-muted-foreground mt-1 text-xs">{config.scopeDescription}</p>
          <code className="text-foreground mt-1.5 block text-xs">
            {config.requiredScopes.join(', ')}
          </code>
        </div>
      ) : null}

      {/* Client ID Input */}
      <div>
        <label
          className="text-foreground mb-1 block text-xs font-medium"
          htmlFor={`${name}-client-id`}
        >
          Client ID
        </label>
        <input
          aria-describedby={showClientIdError ? `${name}-client-id-error` : undefined}
          aria-invalid={showClientIdError}
          id={`${name}-client-id`}
          placeholder="Enter client ID"
          type="text"
          value={clientId}
          className={cn(
            'border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none',
            showClientIdError &&
              'border-destructive focus:border-destructive focus:ring-destructive',
          )}
          onChange={(e) => {
            handleClientIdChange(e.target.value);
          }}
        />
        {showClientIdError ? (
          <p
            className="text-destructive mt-1 flex items-center gap-1 text-xs"
            id={`${name}-client-id-error`}
          >
            <AlertCircle className="h-3 w-3" />
            {validation.clientIdError}
          </p>
        ) : null}
      </div>

      {/* Client Secret Input */}
      <div>
        <label
          className="text-foreground mb-1 block text-xs font-medium"
          htmlFor={`${name}-client-secret`}
        >
          Client Secret
        </label>
        <input
          aria-describedby={showClientSecretError ? `${name}-client-secret-error` : undefined}
          aria-invalid={showClientSecretError}
          id={`${name}-client-secret`}
          placeholder="Enter client secret"
          type="password"
          value={clientSecret}
          className={cn(
            'border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none',
            showClientSecretError &&
              'border-destructive focus:border-destructive focus:ring-destructive',
          )}
          onChange={(e) => {
            handleClientSecretChange(e.target.value);
          }}
        />
        {showClientSecretError ? (
          <p
            className="text-destructive mt-1 flex items-center gap-1 text-xs"
            id={`${name}-client-secret-error`}
          >
            <AlertCircle className="h-3 w-3" />
            {validation.clientSecretError}
          </p>
        ) : null}
      </div>

      {/* Save Button */}
      <button
        disabled={isPending}
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
