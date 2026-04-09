/**
 * Auth IPC handlers — Hub API integration
 *
 * Handles user authentication via the Hub server.
 * Delegates HTTP calls to HubAuthService and transforms responses
 * to match the IPC contract schemas (UserSchema, AuthTokensSchema).
 */

import { AUTH } from '@shared/ipc/auth/channels';

import type { UserSessionManager } from '@main/features/auth';
import type { HubAuthService } from '@main/features/hub/hub-auth-service';

import type { IpcRouter } from '../../ipc/router';

export interface AuthHandlerDependencies {
  hubAuthService: HubAuthService;
  userSessionManager: UserSessionManager;
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

export function registerAuthHandlers(router: IpcRouter, deps: AuthHandlerDependencies): void {
  const { hubAuthService, userSessionManager } = deps;

  router.handle(AUTH.LOGIN.USER, async ({ email, password }) => {
    const result = await hubAuthService.login({ email, password });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Login failed');
    }

    const { user, accessToken, refreshToken, expiresAt } = result.data;

    // Set user session for user-scoped storage
    userSessionManager.setSession({
      userId: user.id,
      email: user.email,
    });

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

  router.handle(AUTH.REGISTER.USER, async ({ email, password, displayName }) => {
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

  router.handle(AUTH.GET.USER, async () => {
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

  router.handle(AUTH.LOGOUT.USER, async () => {
    await hubAuthService.logout();

    // Clear user session for user-scoped storage
    userSessionManager.clearSession();

    return { success: true };
  });

  // Main process is the authoritative token owner — it stores tokens in the
  // secure TokenStore and uses its own stored refresh token for rotation.
  // The renderer's refreshToken input is ignored; the rotated token from
  // the Hub response is returned so the renderer can update its local copy.
  router.handle(AUTH.REFRESH.TOKEN, async (_input) => {
    const result = await hubAuthService.refreshToken();

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Token refresh failed');
    }

    return {
      tokens: {
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        expiresIn: expiresAtToExpiresIn(result.data.expiresAt),
      },
    };
  });

  // Restore a previously authenticated session from encrypted token storage.
  // Called on app startup to silently re-authenticate without user interaction.
  router.handle(AUTH.RESTORE.SESSION, async () => {
    const result = await hubAuthService.restoreSession();

    if (!result.restored) {
      return { restored: false as const };
    }

    // Set user session for user-scoped storage on successful restore
    userSessionManager.setSession({
      userId: result.user.id,
      email: result.user.email,
    });

    return {
      restored: true as const,
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        avatarUrl: result.user.avatarUrl ?? null,
        createdAt: result.user.createdAt,
        lastLoginAt: result.user.lastLoginAt ?? null,
      },
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: expiresAtToExpiresIn(result.expiresAt),
      },
    };
  });
}
