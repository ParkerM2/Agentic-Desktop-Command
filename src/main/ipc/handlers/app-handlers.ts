/**
 * App IPC handlers — system-level checks (Claude CLI auth, OAuth status, startup settings)
 */

import { execFileSync } from 'node:child_process';

import { app } from 'electron';

import type { TokenStore } from '../../auth/token-store';
import type { OAuthConfig } from '../../auth/types';
import type { IpcRouter } from '../router';

interface AppHandlerDeps {
  tokenStore: TokenStore;
  providers: Map<string, OAuthConfig>;
}

function checkClaudeAuth(): {
  installed: boolean;
  authenticated: boolean;
  version?: string;
} {
  try {
    const stdout = execFileSync('claude', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return { installed: true, authenticated: true, version: stdout };
  } catch (error: unknown) {
    const code =
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as Record<string, unknown>).code === 'string'
        ? (error as Record<string, string>).code
        : undefined;
    if (code === 'ENOENT') {
      return { installed: false, authenticated: false };
    }
    // CLI exists but command failed — installed but possibly not authenticated
    return { installed: true, authenticated: false };
  }
}

function getOAuthStatus(
  provider: string,
  deps: AppHandlerDeps,
): { configured: boolean; authenticated: boolean } {
  const config = deps.providers.get(provider);
  const configured = config !== undefined && config.clientId.length > 0;
  const authenticated = deps.tokenStore.hasTokens(provider);
  return { configured, authenticated };
}

export function registerAppHandlers(router: IpcRouter, deps: AppHandlerDeps): void {
  router.handle('app.checkClaudeAuth', () => Promise.resolve(checkClaudeAuth()));

  router.handle('app.getOAuthStatus', ({ provider }) =>
    Promise.resolve(getOAuthStatus(provider, deps)),
  );

  router.handle('app.setOpenAtLogin', ({ enabled }) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return Promise.resolve({ success: true });
  });

  router.handle('app.getOpenAtLogin', () => {
    const result = app.getLoginItemSettings();
    return Promise.resolve({ enabled: result.openAtLogin });
  });
}
