/**
 * App IPC handlers — system-level checks (Claude CLI auth, OAuth status, startup settings)
 */

import { execFileSync, spawn } from 'node:child_process';

import { app } from 'electron';

import { APP } from '@shared/ipc/app/channels';

import type { TokenStore } from '../../auth/token-store';
import type { OAuthConfig } from '../../auth/types';
import type { IpcRouter } from '../../ipc/router';

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

/** Session env vars that Claude Code sets to detect nested invocations. */
const CLAUDE_SESSION_VARS = [
  'CLAUDE_CODE_SESSION',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_ENTRY_POINT',
  'CLAUDE_INNER_AGENT',
];

/** Build env that strips session-detection vars so the CLI doesn't think
 *  it's nested inside another Claude Code session. */
function cleanExecEnv(): Record<string, string> {
  const sessionSet = new Set(CLAUDE_SESSION_VARS);
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !sessionSet.has(key)) {
      env[key] = value;
    }
  }
  return env;
}

function checkClaudeAuth(): {
  installed: boolean;
  authenticated: boolean;
  version?: string;
} {
  const env = cleanExecEnv();

  // Step 1: Check if Claude CLI is installed via --version
  let version: string | undefined;
  try {
    version = execFileSync('claude', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
      shell: true,
      env,
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
      shell: true,
      env,
    }).trim();

    // Try JSON parse first, fall back to string matching for legacy output
    let authenticated = false;
    try {
      const parsed: unknown = JSON.parse(authOutput);
      if (parsed !== null && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        authenticated =
          obj.loggedIn === true ||
          obj.authenticated === true ||
          obj.isLoggedIn === true;
      }
    } catch {
      // Not JSON — check for known text indicators
      const lowerOutput = authOutput.toLowerCase();
      authenticated =
        lowerOutput.includes('authenticated') ||
        lowerOutput.includes('logged in') ||
        lowerOutput.includes('active');
    }

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

/** Launch `claude auth login` which opens the browser for Anthropic OAuth.
 *  Uses shell:true so Windows can resolve claude.cmd, and strips only the
 *  session-detection env vars so the CLI doesn't refuse to run. */
function launchClaudeAuth(): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    const child = spawn('claude', ['auth', 'login'], {
      shell: true,
      env: cleanExecEnv(),
      stdio: 'ignore',
      timeout: 120_000,
    });

    child.on('close', (code) => {
      resolve({ success: code === 0 });
    });

    child.on('error', () => {
      resolve({ success: false });
    });
  });
}

// ── GitHub CLI Auth ──────────────────────────────────────────

function checkGitHubAuth(): {
  installed: boolean;
  authenticated: boolean;
  username?: string;
} {
  // Step 1: Check if gh CLI is installed
  try {
    execFileSync('gh', ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
      shell: true,
    });
  } catch (error: unknown) {
    const { code } = getExecError(error);
    if (code === 'ENOENT') {
      return { installed: false, authenticated: false };
    }
    return { installed: true, authenticated: false };
  }

  // Step 2: Check auth status via `gh auth status`
  try {
    const output = execFileSync('gh', ['auth', 'status'], {
      encoding: 'utf-8',
      timeout: 5000,
      shell: true,
    }).trim();

    // gh auth status prints "Logged in to github.com account <username>"
    const match = /account\s+(\S+)/i.exec(output);
    return {
      installed: true,
      authenticated: true,
      username: match?.[1],
    };
  } catch (error: unknown) {
    // gh auth status exits non-zero when not logged in, but may still
    // print useful info to stderr. The execFileSync throws on non-zero.
    const { status } = getExecError(error);
    if (status !== undefined && status !== 0) {
      return { installed: true, authenticated: false };
    }
    return { installed: true, authenticated: false };
  }
}

/** Launch `gh auth login` which opens the browser for GitHub OAuth device flow. */
function launchGitHubAuth(): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    const child = spawn('gh', ['auth', 'login', '--web', '--git-protocol', 'https'], {
      shell: true,
      stdio: 'ignore',
      timeout: 120_000,
    });

    child.on('close', (code) => {
      resolve({ success: code === 0 });
    });

    child.on('error', () => {
      resolve({ success: false });
    });
  });
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
  router.handle(APP.CHECK['CLAUDE-AUTH'], () => Promise.resolve(checkClaudeAuth()));
  router.handle(APP.LAUNCH['CLAUDE-AUTH'], () => launchClaudeAuth());
  router.handle(APP.CHECK['GITHUB-AUTH'], () => Promise.resolve(checkGitHubAuth()));
  router.handle(APP.LAUNCH['GITHUB-AUTH'], () => launchGitHubAuth());

  router.handle(APP.CHECK['OAUTH-STATUS'], ({ provider }) =>
    Promise.resolve(getOAuthStatus(provider, deps)),
  );

  router.handle(APP.SET['LOGIN-SETTING'], ({ enabled }) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return Promise.resolve({ success: true });
  });

  router.handle(APP.GET['LOGIN-SETTING'], () => {
    const result = app.getLoginItemSettings();
    return Promise.resolve({ enabled: result.openAtLogin });
  });
}
