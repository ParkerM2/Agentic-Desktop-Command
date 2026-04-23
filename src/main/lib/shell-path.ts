/**
 * Inherit the login-shell PATH on macOS/Linux.
 *
 * A packaged .app launched from Finder/Launchpad (or via `open`) inherits only
 * launchd's minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin). That misses Homebrew
 * (/opt/homebrew/bin, /usr/local/bin), nvm shims, and npm global bins — which
 * means `which claude` fails and every agent spawn ENOENTs.
 *
 * We shell out to the user's login shell once at startup to capture the PATH
 * the user actually uses in a terminal, and merge it into process.env.PATH.
 *
 * Windows inherits PATH from the registry, so this is a no-op there.
 */

import { execFileSync } from 'node:child_process';

import { appLogger } from '@main/lib/logger';

/** Location probes added unconditionally — cheap insurance when the shell trick fails. */
const COMMON_MAC_BIN_DIRS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/opt/local/bin',
];

const COMMON_HOME_BIN_DIRS = [
  '.npm-global/bin',
  '.volta/bin',
  '.cargo/bin',
  '.local/bin',
  'bin',
];

function readLoginShellPath(shell: string): string | null {
  try {
    const out = execFileSync(
      shell,
      ['-ilc', 'command printf "%s" "$PATH"'],
      { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const trimmed = out.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * Idempotently merge the user's login-shell PATH and common bin directories
 * into process.env.PATH. Safe to call multiple times.
 */
export function inheritShellPath(): void {
  if (process.platform === 'win32') return;

  const parts = new Set<string>(
    (process.env.PATH ?? '').split(':').filter((p) => p.length > 0),
  );

  const shell = process.env.SHELL && process.env.SHELL.length > 0 ? process.env.SHELL : '/bin/sh';
  const shellPath = readLoginShellPath(shell);
  if (shellPath) {
    for (const dir of shellPath.split(':')) {
      if (dir.length > 0) parts.add(dir);
    }
  }

  if (process.platform === 'darwin') {
    for (const dir of COMMON_MAC_BIN_DIRS) parts.add(dir);
  }

  const home = process.env.HOME;
  if (home && home.length > 0) {
    for (const suffix of COMMON_HOME_BIN_DIRS) {
      parts.add(`${home}/${suffix}`);
    }
  }

  const merged = [...parts].join(':');
  if (merged !== process.env.PATH) {
    process.env.PATH = merged;
    appLogger.info(`[ShellPath] Inherited PATH (${String(parts.size)} entries) from ${shell}`);
  }
}
