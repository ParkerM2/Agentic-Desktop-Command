/**
 * Auth IPC handlers — Hub API integration
 *
 * Handles user authentication via the Hub server.
 * Delegates HTTP calls to HubAuthService and transforms responses
 * to match the IPC contract schemas (UserSchema, AuthTokensSchema).
 */

import type { HubAuthService } from '@main/services/hub/hub-auth-service';

import type { IpcRouter } from '../router';

export interface AuthHandlerDependencies {
  hubAuthService: HubAuthService;
}

/**
 * Convert an ISO `expiresAt` timestamp to a relative `expiresIn` value (seconds).
 * Returns 0 if the token is already expired.
 */
function expiresAtToExpiresIn(expiresAt: string): number {
  const expiresMs = new Date(expiresAt).getTime();
  const nowMs = Date.now();
  return Math.max(0, Math.round((expiresMs - nowMs) / 1000));
}

export function registerAuthHandlers(
  router: IpcRouter,
  deps: AuthHandlerDependencies,
): void {
  const { hubAuthService } = deps;

  router.handle('auth.login', async ({ email, password }) => {
    const result = await hubAuthService.login({ email, password });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Login failed');
    }

    const { user, accessToken, refreshToken, expiresAt } = result.data;
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt ?? null,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: expiresAtToExpiresIn(expiresAt),
      },
    };
  });

  router.handle('auth.register', async ({ email, password, displayName }) => {
    const result = await hubAuthService.register({ email, password, displayName });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Registration failed');
    }

    const { user, accessToken, refreshToken, expiresAt } = result.data;
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt ?? null,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: expiresAtToExpiresIn(expiresAt),
      },
    };
  });

  router.handle('auth.me', async () => {
    const result = await hubAuthService.getCurrentUser();

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to get current user');
    }

    const user = result.data;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
    };
  });

  router.handle('auth.logout', async () => {
    await hubAuthService.logout();
    return { success: true };
  });

  router.handle('auth.refresh', async ({ refreshToken }) => {
    const result = await hubAuthService.refreshToken();

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Token refresh failed');
    }

    return {
      tokens: {
        accessToken: result.data.accessToken,
        refreshToken,
        expiresIn: expiresAtToExpiresIn(result.data.expiresAt),
      },
    };
  });
}
