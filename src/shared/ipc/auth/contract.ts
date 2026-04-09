/**
 * Auth IPC Contract
 *
 * Invoke channel definitions for authentication operations:
 * register, login, logout, token refresh, current user, and session restore.
 */

import { z } from 'zod';

import { AUTH, AUTH_EVENTS } from './channels';
import {
  LoginInputSchema,
  LoginOutputSchema,
  RefreshInputSchema,
  RefreshOutputSchema,
  RegisterInputSchema,
  RegisterOutputSchema,
  RestoreOutputSchema,
  UserSchema,
} from './schemas';

/** Invoke channels for auth operations */
export const authInvoke = {
  [AUTH.REGISTER.USER]: {
    input: RegisterInputSchema,
    output: RegisterOutputSchema,
  },
  [AUTH.LOGIN.USER]: {
    input: LoginInputSchema,
    output: LoginOutputSchema,
  },
  [AUTH.LOGOUT.USER]: {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  [AUTH.REFRESH.TOKEN]: {
    input: RefreshInputSchema,
    output: RefreshOutputSchema,
  },
  [AUTH.GET.USER]: {
    input: z.object({}),
    output: UserSchema,
  },
  [AUTH.RESTORE.SESSION]: {
    input: z.object({}),
    output: RestoreOutputSchema,
  },
} as const;

/** Event channels for auth operations */
export const authEvents = {
  [AUTH_EVENTS.SESSION.CHANGED]: {
    payload: z.object({
      userId: z.string().nullable(),
      email: z.string().nullable(),
    }),
  },
} as const;
