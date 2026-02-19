/**
 * OAuth IPC Schemas
 *
 * Zod schemas for OAuth authorization flow: provider identification,
 * authorization result, authentication status, and revocation.
 */

import { z } from 'zod';

export const OAuthProviderInputSchema = z.object({
  provider: z.string(),
});

export const OAuthAuthorizeOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export const OAuthAuthStatusOutputSchema = z.object({
  authenticated: z.boolean(),
  expiresAt: z.string().optional(),
});

export const OAuthRevokeOutputSchema = z.object({
  success: z.boolean(),
});
