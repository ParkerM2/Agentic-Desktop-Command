/**
 * Tmux Commands — Low-level tmux CLI wrapper
 *
 * Wraps tmux CLI commands using child_process.execSync/exec.
 * All functions gracefully handle tmux not being installed.
 */

import { execSync } from 'node:child_process';
import { platform } from 'node:os';

import { appLogger } from '../../lib/logger';

const TMUX_EXEC_TIMEOUT_MS = 5_000;

/** Check if tmux is installed and available on the system PATH. */
export function isTmuxInstalled(): boolean {
  try {
    // `which` is not available on Windows; use `where` instead
    const cmd = platform() === 'win32' ? 'where tmux' : 'which tmux';
    execSync(cmd, { timeout: TMUX_EXEC_TIMEOUT_MS, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Run a tmux command and return trimmed stdout. Throws on non-zero exit. */
function runTmux(args: string): string {
  const result = execSync(`tmux ${args}`, {
    timeout: TMUX_EXEC_TIMEOUT_MS,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return result.trim();
}

/**
 * Create a new detached tmux session.
 * Optionally sets environment variables via -e flags.
 */
export function tmuxNewSession(name: string, env?: Record<string, string>): void {
  const envFlags = env
    ? Object.entries(env)
        .map(([key, value]) => `-e ${key}=${value}`)
        .join(' ')
    : '';

  const cmd = `new-session -d -s ${escapeArg(name)} ${envFlags}`.trim();
  runTmux(cmd);
  appLogger.info(`[TmuxBridge] Created session: ${name}`);
}

/** Send keys (text input) to a tmux session or pane. */
export function tmuxSendKeys(target: string, keys: string): void {
  runTmux(`send-keys -t ${escapeArg(target)} ${escapeArg(keys)} Enter`);
}

/** Capture the visible contents of a tmux pane. */
export function tmuxCapturePane(paneId: string): string {
  return runTmux(`capture-pane -t ${escapeArg(paneId)} -p`);
}

/** Kill a tmux session by name. */
export function tmuxKillSession(name: string): void {
  try {
    runTmux(`kill-session -t ${escapeArg(name)}`);
    appLogger.info(`[TmuxBridge] Killed session: ${name}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    appLogger.warn(`[TmuxBridge] Failed to kill session "${name}": ${msg}`);
  }
}

/** List all tmux sessions. Returns raw output lines. */
export function tmuxListSessions(): string[] {
  try {
    const output = runTmux(
      'list-sessions -F "#{session_name}|#{session_id}|#{session_created}|#{session_attached}|#{session_windows}"',
    );
    if (output.length === 0) {
      return [];
    }
    return output.split('\n').filter((line) => line.length > 0);
  } catch {
    // tmux returns error when no server is running (no sessions)
    return [];
  }
}

/** Check if a specific tmux session exists by name. */
export function tmuxHasSession(name: string): boolean {
  try {
    runTmux(`has-session -t ${escapeArg(name)}`);
    return true;
  } catch {
    return false;
  }
}

/** Escape a shell argument for safe use in tmux commands. */
function escapeArg(value: string): string {
  // Wrap in single quotes and escape any existing single quotes
  return `'${value.replaceAll("'", "'\\''")}'`;
}
