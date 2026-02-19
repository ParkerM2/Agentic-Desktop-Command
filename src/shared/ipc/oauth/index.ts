/**
 * OAuth IPC -- Barrel Export
 *
 * Re-exports all OAuth-related schemas and contract definitions.
 */

export {
  OAuthAuthStatusOutputSchema,
  OAuthAuthorizeOutputSchema,
  OAuthProviderInputSchema,
  OAuthRevokeOutputSchema,
} from './schemas';

export { oauthInvoke } from './contract';
