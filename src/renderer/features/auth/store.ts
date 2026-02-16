/**
 * Auth Zustand store — manages JWT tokens, user, and isAuthenticated state.
 *
 * Persists tokens to localStorage for session restoration on app restart.
 * isAuthenticated is derived: user !== null && accessToken !== null.
 */

import { create } from 'zustand';

import type { AuthTokens, User } from '@shared/types/auth';

const STORAGE_KEY = 'adc-auth';

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt: number | null;
}

function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function persistAuth(
  user: User,
  accessToken: string,
  refreshToken: string,
  expiresAt: number | null,
): void {
  const data: StoredAuth = { accessToken, expiresAt, refreshToken, user };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearPersistedAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  updateTokens: (tokens: AuthTokens) => void;
  setExpiresAt: (expiresAt: number | null) => void;
  setInitializing: (value: boolean) => void;
}

const stored = loadStoredAuth();

export const useAuthStore = create<AuthState>()((set) => ({
  user: stored?.user ?? null,
  accessToken: stored?.accessToken ?? null,
  refreshToken: stored?.refreshToken ?? null,
  expiresAt: stored?.expiresAt ?? null,
  isAuthenticated: stored !== null,
  isInitializing: stored !== null,

  setAuth: (user, tokens) => {
    persistAuth(user, tokens.accessToken, tokens.refreshToken, null);
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
    });
  },

  clearAuth: () => {
    clearPersistedAuth();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,
    });
  },

  setUser: (user) => {
    set((state) => {
      if (state.accessToken && state.refreshToken) {
        persistAuth(user, state.accessToken, state.refreshToken, state.expiresAt);
      }
      return { user };
    });
  },

  updateTokens: (tokens) => {
    set((state) => {
      if (state.user) {
        persistAuth(state.user, tokens.accessToken, tokens.refreshToken, state.expiresAt);
      }
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  },

  setExpiresAt: (expiresAt) => {
    set((state) => {
      if (state.user && state.accessToken && state.refreshToken) {
        persistAuth(state.user, state.accessToken, state.refreshToken, expiresAt);
      }
      return { expiresAt };
    });
  },

  setInitializing: (value) => {
    set({ isInitializing: value });
  },
}));
