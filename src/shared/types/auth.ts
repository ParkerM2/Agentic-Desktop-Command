/**
 * Auth-related types for Hub authentication
 */

/** User profile returned from the API (no sensitive fields) */
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/** JWT token pair */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Login input */
export interface LoginInput {
  email: string;
  password: string;
}

/** Login output */
export interface LoginOutput {
  user: User;
  tokens: AuthTokens;
}

/** Register input */
export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

/** Register output */
export interface RegisterOutput {
  user: User;
  tokens: AuthTokens;
}

/** Refresh token input */
export interface RefreshInput {
  refreshToken: string;
}

/** Refresh token output */
export interface RefreshOutput {
  tokens: AuthTokens;
}

/** Auth state for the renderer store */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
