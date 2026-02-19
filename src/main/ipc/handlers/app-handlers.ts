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

function getExecError(error: unknown): { code?: string; status?: number } {
  if (error === null || typeof error !== 'object') {
    return {};
  }
  const record = error as Record<string, unknown>;
  return {
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
  };
}

function checkClaudeAuth(): {
  installed: boolean;
  authenticated: boolean;
  version?: string;
} {
  // Step 1: Check if Claude CLI is installed via --version
  let version: string | undefined;
  try {
    version = execFileSync('claude', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
  } catch (error: unknown) {
    const { code } = getExecError(error);
    if (code === 'ENOENT') {
      return { installed: false, authenticated: false };
    }
    // CLI exists but --version failed — treat as installed but unknown auth
    return { installed: true, authenticated: false };
  }

  // Step 2: Verify actual authentication via `claude auth status`
  try {
    const authOutput = execFileSync('claude', ['auth', 'status'], {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    // If the command succeeds and output contains "authenticated" or "logged in",
    // the user is authenticated. A non-zero exit or "not authenticated" means no auth.
    const lowerOutput = authOutput.toLowerCase();
    const authenticated =
      lowerOutput.includes('authenticated') ||
      lowerOutput.includes('logged in') ||
      lowerOutput.includes('active');

    return { installed: true, authenticated, version };
  } catch (error: unknown) {
    const { status } = getExecError(error);

    // Non-zero exit from `auth status` means not authenticated
    if (status !== undefined && status !== 0) {
      return { installed: true, authenticated: false, version };
    }

    // Command not recognized (older CLI without auth subcommand) — fall back
    // to assuming authenticated if --version succeeded
    return { installed: true, authenticated: true, version };
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
