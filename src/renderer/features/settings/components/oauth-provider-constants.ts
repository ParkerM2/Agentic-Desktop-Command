/**
 * OAuth provider constants, types, validation, and hooks.
 * Shared by OAuthProviderSettings and OAuthProviderForm.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

// ── Types ───────────────────────────────────────────────────

export interface ProviderConfig {
  label: string;
  consoleUrl: string;
  consoleName: string;
  requiredScopes: string[];
  scopeDescription: string;
}

export interface OAuthProviderInfo {
  name: string;
  hasCredentials: boolean;
}

export interface ValidationState {
  clientIdError: string | null;
  clientSecretError: string | null;
}

// ── Constants ───────────────────────────────────────────────

export const PROVIDER_CONFIG: Partial<Record<string, ProviderConfig>> = {
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
    requiredScopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    scopeDescription: 'Profile, email, and Google Calendar access (read/write events)',
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

export const ICON_SIZE = 'h-4 w-4';
export const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors';

// ── Validation ──────────────────────────────────────────────

export function validateCredentials(clientId: string, clientSecret: string): ValidationState {
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

// ── Hooks ───────────────────────────────────────────────────

export function useOAuthProviders() {
  return useQuery<OAuthProviderInfo[]>({
    queryKey: ['settings', 'oauthProviders'],
    queryFn: () => ipc('settings.getOAuthProviders', {}),
  });
}

export function useSaveOAuthProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; clientId: string; clientSecret: string }) =>
      ipc('settings.setOAuthProvider', data),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'oauthProviders'] });
    },
  });
}
