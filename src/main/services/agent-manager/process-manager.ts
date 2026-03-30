/**
 * Process Manager — Child process lifecycle for headless Claude sessions
 *
 * Spawns Claude CLI with stream-json flags via child_process.spawn (NOT node-pty).
 * Manages stdin/stdout streams, process health monitoring, and clean shutdown.
 */

import { spawn } from 'node:child_process';

import { agentLogger } from '@main/lib/logger';

import type { ChildProcess } from 'node:child_process';

/** Configuration for spawning a headless Claude process */
export interface ProcessSpawnConfig {
  /** Working directory for the Claude process */
  cwd: string;
  /** Initial prompt to send after spawn */
  prompt: string;
  /** Claude model to use (e.g. 'claude-sonnet-4-6') */
  model?: string;
  /** Optional name for the session */
  name?: string;
}

/** Represents a managed child process with health tracking */
export interface ManagedProcess {
  /** The underlying child process */
  process: ChildProcess;
  /** Process ID (from the OS) */
  pid: number;
  /** Whether the process is still running */
  alive: boolean;
  /** Timestamp of last activity (stdout data received) */
  lastActivityAt: Date;
  /** Timestamp when process was spawned */
  spawnedAt: Date;
}

/** Events emitted by the process manager */
export interface ProcessManagerEvents {
  onStdout: (handler: (data: Buffer) => void) => () => void;
  onStderr: (handler: (data: string) => void) => () => void;
  onExit: (handler: (code: number | null, signal: string | null) => void) => () => void;
  onError: (handler: (error: Error) => void) => () => void;
}

export interface ProcessManager {
  /** Spawn a new headless Claude process */
  spawn: (config: ProcessSpawnConfig) => ManagedProcess;
  /** Send an NDJSON user message to the process stdin */
  sendMessage: (process: ManagedProcess, message: string) => boolean;
  /** Kill the process gracefully (SIGTERM, then SIGKILL after grace period) */
  kill: (process: ManagedProcess) => void;
  /** Check if the process is still alive */
  isAlive: (process: ManagedProcess) => boolean;
  /** Register event handlers for a managed process */
  events: (process: ManagedProcess) => ProcessManagerEvents;
}

/** Session env vars that Claude Code sets to detect nested invocations. */
const CLAUDE_SESSION_VARS = new Set([
  'CLAUDE_CODE_SESSION',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_ENTRY_POINT',
  'CLAUDE_INNER_AGENT',
]);

/** Grace period before SIGKILL after SIGTERM (ms) */
const KILL_GRACE_PERIOD_MS = 5000;

/**
 * Build a clean environment for the Claude process.
 * Strips session-detection vars so Claude doesn't think it's nested.
 */
function buildCleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !CLAUDE_SESSION_VARS.has(key)) {
      env[key] = value;
    }
  }
  return env;
}

/**
 * Build the CLI arguments for a headless stream-json Claude process.
 */
function buildSpawnArgs(config: ProcessSpawnConfig): string[] {
  const args = [
    '-p',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--replay-user-messages',
  ];

  if (config.model) {
    args.push('--model', config.model);
  }

  return args;
}

/**
 * Format a user message as NDJSON for Claude stream-json stdin.
 */
function formatUserMessage(message: string): string {
  const payload = {
    type: 'user',
    message: { role: 'user', content: message },
  };
  return `${JSON.stringify(payload)}\n`;
}

/**
 * Create a ProcessManager for spawning and managing headless Claude processes.
 */
export function createProcessManager(): ProcessManager {
  return {
    spawn(config) {
      const args = buildSpawnArgs(config);
      const env = buildCleanEnv();

      agentLogger.info(`[AgentManager] Spawning claude process in ${config.cwd}`);
      agentLogger.info(`[AgentManager] Args: claude ${args.join(' ')}`);

      const child = spawn('claude', args, {
        cwd: config.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const now = new Date();
      const pid = child.pid ?? 0;

      if (pid === 0) {
        agentLogger.error('[AgentManager] Failed to get PID for spawned process');
      } else {
        agentLogger.info(`[AgentManager] Process spawned with PID ${String(pid)}`);
      }

      const managed: ManagedProcess = {
        process: child,
        pid,
        alive: true,
        lastActivityAt: now,
        spawnedAt: now,
      };

      // Track process exit
      child.on('exit', (code, signal) => {
        managed.alive = false;
        agentLogger.info(
          `[AgentManager] Process ${String(pid)} exited: code=${String(code)}, signal=${String(signal)}`,
        );
      });

      child.on('error', (error) => {
        managed.alive = false;
        agentLogger.error(`[AgentManager] Process ${String(pid)} error: ${error.message}`);
      });

      // Send initial prompt after spawn
      if (config.prompt.length > 0) {
        const formatted = formatUserMessage(config.prompt);
        child.stdin.write(formatted);
      }

      return managed;
    },

    sendMessage(managed, message) {
      if (!managed.alive) {
        agentLogger.warn(
          `[AgentManager] Cannot send message to dead process ${String(managed.pid)}`,
        );
        return false;
      }

      const { stdin } = managed.process;
      if (!stdin || stdin.destroyed) {
        agentLogger.warn(
          `[AgentManager] stdin not available for process ${String(managed.pid)}`,
        );
        return false;
      }

      const formatted = formatUserMessage(message);
      stdin.write(formatted);
      managed.lastActivityAt = new Date();
      return true;
    },

    kill(managed) {
      if (!managed.alive) {
        return;
      }

      const { pid } = managed;
      agentLogger.info(`[AgentManager] Sending SIGTERM to process ${String(pid)}`);
      managed.process.kill('SIGTERM');

      // Force-kill after grace period if still alive
      const killTimer = setTimeout(() => {
        if (managed.alive) {
          agentLogger.warn(
            `[AgentManager] Process ${String(pid)} did not exit, sending SIGKILL`,
          );
          managed.process.kill('SIGKILL');
        }
      }, KILL_GRACE_PERIOD_MS);

      // Clean up timer if process exits before grace period
      managed.process.once('exit', () => {
        clearTimeout(killTimer);
      });
    },

    isAlive(managed) {
      return managed.alive;
    },

    events(managed) {
      const stdoutHandlers = new Set<(data: Buffer) => void>();
      const stderrHandlers = new Set<(data: string) => void>();
      const exitHandlers = new Set<(code: number | null, signal: string | null) => void>();
      const errorHandlers = new Set<(error: Error) => void>();

      const child = managed.process;

      child.stdout?.on('data', (data: Buffer) => {
        managed.lastActivityAt = new Date();
        for (const handler of stdoutHandlers) {
          handler(data);
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const str = data.toString('utf-8');
        for (const handler of stderrHandlers) {
          handler(str);
        }
      });

      child.on('exit', (code, signal) => {
        for (const handler of exitHandlers) {
          handler(code, signal);
        }
      });

      child.on('error', (error) => {
        for (const handler of errorHandlers) {
          handler(error);
        }
      });

      return {
        onStdout(handler) {
          stdoutHandlers.add(handler);
          return () => {
            stdoutHandlers.delete(handler);
          };
        },
        onStderr(handler) {
          stderrHandlers.add(handler);
          return () => {
            stderrHandlers.delete(handler);
          };
        },
        onExit(handler) {
          exitHandlers.add(handler);
          return () => {
            exitHandlers.delete(handler);
          };
        },
        onError(handler) {
          errorHandlers.add(handler);
          return () => {
            errorHandlers.delete(handler);
          };
        },
      };
    },
  };
}
