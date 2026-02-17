/**
 * Auth IPC — Barrel Export
 *
 * Re-exports all auth-related schemas and contract definitions.
 */

export {
  AuthTokensSchema,
  LoginInputSchema,
  LoginOutputSchema,
  RefreshInputSchema,
  RefreshOutputSchema,
  RegisterInputSchema,
  RegisterOutputSchema,
  UserSchema,
} from './schemas';

export { authEvents, authInvoke } from './contract';
