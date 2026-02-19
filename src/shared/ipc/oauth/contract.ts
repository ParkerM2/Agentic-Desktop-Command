/**
 * OAuth IPC Contract
 *
 * Invoke channel definitions for OAuth operations:
 * authorize (start OAuth flow), check authentication status,
 * and revoke provider tokens.
 */

import {
  OAuthAuthStatusOutputSchema,
  OAuthAuthorizeOutputSchema,
  OAuthProviderInputSchema,
  OAuthRevokeOutputSchema,
} from './schemas';

/** Invoke channels for OAuth operations */
export const oauthInvoke = {
  'oauth.authorize': {
    input: OAuthProviderInputSchema,
    output: OAuthAuthorizeOutputSchema,
  },
  'oauth.isAuthenticated': {
    input: OAuthProviderInputSchema,
    output: OAuthAuthStatusOutputSchema,
  },
  'oauth.revoke': {
    input: OAuthProviderInputSchema,
    output: OAuthRevokeOutputSchema,
  },
} as const;
