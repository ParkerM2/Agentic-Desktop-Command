/**
 * OAuth IPC Contract
 *
 * Invoke channel definitions for OAuth operations:
 * authorize (start OAuth flow), check authentication status,
 * and revoke provider tokens.
 */

import { OAUTH } from './channels';
import {
  OAuthAuthStatusOutputSchema,
  OAuthAuthorizeOutputSchema,
  OAuthProviderInputSchema,
  OAuthRevokeOutputSchema,
} from './schemas';

/** Invoke channels for OAuth operations */
export const oauthInvoke = {
  [OAUTH.AUTHORIZE.PROVIDER]: {
    input: OAuthProviderInputSchema,
    output: OAuthAuthorizeOutputSchema,
  },
  [OAUTH.CHECK.AUTHENTICATED]: {
    input: OAuthProviderInputSchema,
    output: OAuthAuthStatusOutputSchema,
  },
  [OAUTH.REVOKE.PROVIDER]: {
    input: OAuthProviderInputSchema,
    output: OAuthRevokeOutputSchema,
  },
} as const;
