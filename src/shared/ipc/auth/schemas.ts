/**
 * Auth IPC Schemas
 *
 * Zod schemas for authentication: user profile, JWT tokens,
 * login, register, and token refresh.
 */

import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export const LoginInputSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const LoginOutputSchema = z.object({
  user: UserSchema,
  tokens: AuthTokensSchema,
});

export const RegisterInputSchema = z.object({
  email: z.string(),
  password: z.string(),
  displayName: z.string(),
});

export const RegisterOutputSchema = z.object({
  user: UserSchema,
  tokens: AuthTokensSchema,
});

export const RefreshInputSchema = z.object({
  refreshToken: z.string(),
});

export const RefreshOutputSchema = z.object({
  tokens: AuthTokensSchema,
});
