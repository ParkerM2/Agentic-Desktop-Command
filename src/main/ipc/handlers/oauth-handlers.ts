/**
 * OAuth IPC handlers — thin layer between IPC router and OAuthManager
 *
 * Delegates to oauthManager for authorize (BrowserWindow consent flow),
 * authentication status checks, and token revocation.
 */

import type { OAuthManager } from '../../auth/oauth-manager';
import type { IpcRouter } from '../router';

export function registerOAuthHandlers(router: IpcRouter, oauthManager: OAuthManager): void {
  router.handle('oauth.authorize', async ({ provider }) => {
    try {
      await oauthManager.authorize(provider);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });

  router.handle('oauth.isAuthenticated', async ({ provider }) => {
    const authenticated = oauthManager.isAuthenticated(provider);

    if (!authenticated) {
      return { authenticated: false };
    }

    try {
      // Attempt to get a valid access token to verify it's not expired
      await oauthManager.getAccessToken(provider);
      return { authenticated: true };
    } catch {
      return { authenticated: false };
    }
  });

  router.handle('oauth.revoke', async ({ provider }) => {
    try {
      await oauthManager.revoke(provider);
      return { success: true };
    } catch {
      return { success: false };
    }
  });
}
