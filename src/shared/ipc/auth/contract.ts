/**
 * Auth IPC Contract
 *
 * Invoke channel definitions for authentication operations:
 * register, login, logout, token refresh, and current user.
 */

import { z } from 'zod';

import {
  LoginInputSchema,
  LoginOutputSchema,
  RefreshInputSchema,
  RefreshOutputSchema,
  RegisterInputSchema,
  RegisterOutputSchema,
  UserSchema,
} from './schemas';

/** Invoke channels for auth operations */
export const authInvoke = {
  'auth.register': {
    input: RegisterInputSchema,
    output: RegisterOutputSchema,
  },
  'auth.login': {
    input: LoginInputSchema,
    output: LoginOutputSchema,
  },
  'auth.logout': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'auth.refresh': {
    input: RefreshInputSchema,
    output: RefreshOutputSchema,
  },
  'auth.me': {
    input: z.object({}),
    output: UserSchema,
  },
} as const;

/** Auth has no event channels currently */
export const authEvents = {} as const;
