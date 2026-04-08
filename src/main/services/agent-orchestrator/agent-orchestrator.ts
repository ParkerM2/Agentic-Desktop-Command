/**
 * Agent Orchestrator — Headless Claude agent lifecycle manager
 *
 * Replaces the fire-and-forget TaskLauncher with proper lifecycle
 * management: spawns agents, tracks PIDs, writes hooks configs,
 * monitors for exit events, and emits session events.
 */

import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { DEFAULT_SECURITY_SETTINGS } from '@shared/types/security';
import type { SecuritySettings } from '@shared/types/security';

import { agentLogger } from '@main/lib/logger';

import { writeHooksConfig } from './hooks-template';

import type {
  AgentOrchestrator,
  AgentSession,
  AgentSessionEvent,
  AgentSessionEventHandler,
  SpawnOptions,
} from './types';
import type { MilestonesService } from '../milestones/milestones-service';
import type { RelayService } from '../relay/relay-service';
import type { ChildProcess } from 'node:child_process';
import type { WriteStream } from 'node:fs';

const KILL_GRACE_PERIOD_MS = 5000;

/** Regex pattern for valid taskId characters */
const TASK_ID_PATTERN = /^[a-zA-Z0-9_.-]+$/;

/**
 * Converts a glob-like pattern to a RegExp.
 * Supports '*' as wildcard (matches any characters).
 * Pattern is anchored with ^ and $.
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replaceAll(/[.+?^${}()|[\]\\]/g, '\\$&');
  const withWildcards = escaped.replaceAll('\\*', '.*');
  return new RegExp(`^${withWildcards}$`);
}

/**
 * Checks whether a given env var name matches any pattern in a list.
 * Patterns support glob-like '*' wildcards.
 */
function matchesAnyPattern(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegex(pattern).test(name));
}

/**
 * Copies all defined process.env entries into the result object.
 */
function copyProcessEnv(result: Record<string, string>): void {
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
}

/**
 * Filters process.env entries through allowlist and blocklist patterns.
 * Allowlisted vars are always kept; blocklisted vars are removed;
 * everything else passes through.
 */
function filterSandboxedEnv(
  result: Record<string, string>,
  allowPatterns: string[],
  blockPatterns: string[],
): void {
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) {
      continue;
    }

    // Always pass through vars matching the allowlist
    if (matchesAnyPattern(key, allowPatterns)) {
      result[key] = value;
      continue;
    }

    // Block vars matching the blocklist
    if (matchesAnyPattern(key, blockPatterns)) {
      continue;
    }

    // Not in either list — allow through
    result[key] = value;
  }
}

/**
 * Scrubs environment variables according to security settings.
 *
 * - 'sandboxed' mode: filters out vars matching blocklist patterns,
 *   always keeps vars matching envAlwaysPass patterns
 * - 'unrestricted' mode: passes full process.env
 *
 * Adds a SECURITY_CONTEXT descriptor var and merges with extraEnv.
 */
export function scrubEnvironment(
  settings: SecuritySettings,
  extraEnv?: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  if (settings.envMode === 'unrestricted') {
    copyProcessEnv(result);
  } else {
    filterSandboxedEnv(result, settings.envAlwaysPass, settings.envBlocklist);
  }

  // Add security context descriptor
  result.SECURITY_CONTEXT = JSON.stringify({
    mode: settings.envMode,
    blockedPatterns: settings.envMode === 'sandboxed' ? settings.envBlocklist : [],
  });

  // Merge extra env vars (these always take precedence)
  if (extraEnv) {
    for (const [key, value] of Object.entries(extraEnv)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validates that the taskId contains only safe characters.
 * Prevents shell metacharacter injection.
 */
function validateTaskId(taskId: string): void {
  if (!TASK_ID_PATTERN.test(taskId)) {
    throw new Error('Invalid taskId: contains disallowed characters');
  }
}

/**
 * Validates working directory: must exist, be a directory, and
 * optionally be restricted to the user's home directory or project path.
 */
function validateWorkingDirectory(
  cwd: string,
  projectPath: string,
  restricted: boolean,
): void {
  const resolved = resolve(cwd);

  if (!existsSync(resolved)) {
    throw new Error(`Working directory does not exist: ${resolved}`);
  }

  const stat = statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error(`Working directory path is not a directory: ${resolved}`);
  }

  if (restricted) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    const resolvedHome = home.length > 0 ? resolve(home) : '';
    const resolvedProject = resolve(projectPath);
    const normalizedCwd = resolved.toLowerCase();
    const normalizedHome = resolvedHome.toLowerCase();
    const normalizedProject = resolvedProject.toLowerCase();

    const isUnderHome =
      normalizedHome.length > 0 && normalizedCwd.startsWith(normalizedHome);
    const isUnderProject = normalizedCwd.startsWith(normalizedProject);

    if (!isUnderHome && !isUnderProject) {
      throw new Error(
        `Working directory is outside allowed paths. ` +
          `cwd: ${resolved}, home: ${resolvedHome}, project: ${resolvedProject}`,
      );
    }
  }
}

export function createAgentOrchestrator(
  progressBaseDir: string,
  milestonesService?: MilestonesService,
  relayService?: RelayService,
): AgentOrchestrator {
  const sessions = new Map<string, AgentSession>();
  const processes = new Map<string, ChildProcess>();
  const logStreams = new Map<string, WriteStream>();
  const eventHandlers: AgentSessionEventHandler[] = [];

  function emitEvent(event: AgentSessionEvent): void {
    for (const handler of eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        agentLogger.error('[AgentOrchestrator] Event handler error:', message);
      }
    }
  }

  function updateSession(sessionId: string, updates: Partial<AgentSession>): void {
    const session = sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  function cleanupHooksConfig(session: AgentSession): void {
    // Only restore settings when this is the last active session,
    // otherwise other sessions still need their hooks in place.
    const activeSessions = [...sessions.values()].filter(
      (s) => s.id !== session.id && (s.status === 'active' || s.status === 'spawning'),
    );

    if (activeSessions.length > 0) {
      return;
    }

    try {
      if (session.originalSettingsContent === null) {
        // No settings file existed before — remove it
        unlinkSync(session.hooksConfigPath);
      } else {
        // Restore original content
        writeFileSync(session.hooksConfigPath, session.originalSettingsContent, 'utf-8');
      }
    } catch {
      // Config may already be cleaned up — ignore
    }
  }

  function cleanupProgressFiles(session: AgentSession): void {
    // Remove JSONL progress file and log file after session ends.
    // Final status is already emitted via events (and synced to Hub).
    for (const filePath of [session.progressFile, session.logFile]) {
      try {
        unlinkSync(filePath);
      } catch {
        // File may already be gone — ignore
      }
    }
  }

  function tryUpdateMilestones(taskId: string): void {
    if (!milestonesService) {
      return;
    }
    try {
      const milestones = milestonesService.listMilestones({});
      for (const milestone of milestones) {
        const matchingTask = milestone.tasks.find(
          (t) => t.title === taskId || t.id === taskId,
        );
        if (matchingTask && !matchingTask.completed) {
          milestonesService.toggleTask(milestone.id, matchingTask.id);
        }
      }
    } catch (milestoneError) {
      const milestoneMessage =
        milestoneError instanceof Error ? milestoneError.message : 'Unknown error';
      agentLogger.warn('[AgentOrchestrator] Milestone update failed:', milestoneMessage);
    }
  }

  function cleanupLogStream(sessionId: string): void {
    const stream = logStreams.get(sessionId);
    if (stream) {
      stream.end();
      logStreams.delete(sessionId);
    }
  }

  return {
    spawn(options: SpawnOptions): Promise<AgentSession> {
      const { taskId, projectPath, subProjectPath, prompt, phase, env, securitySettings } =
        options;

      // ── Relay: delegate to remote host if project is remote ─────
      if (relayService && options.projectId && relayService.isRemoteProject(options.projectId)) {
        const hostDeviceId = relayService.getHostDeviceId(options.projectId) ?? '';
        const sessionId = relayService.spawnRemoteSession(hostDeviceId, options.projectId, {
          agentRole: phase,
          prompt,
          workDir: projectPath,
          taskId,
        });
        // Return a minimal session record for the relay-managed remote session
        const relaySession: AgentSession = {
          id: sessionId,
          taskId,
          pid: 0,
          status: 'active',
          phase,
          spawnedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
          progressFile: '',
          logFile: '',
          hooksConfigPath: '',
          originalSettingsContent: null,
          exitCode: null,
          projectPath,
          command: prompt,
        };
        sessions.set(sessionId, relaySession);
        return Promise.resolve(relaySession);
      }

      // ── Security: validate taskId ───────────────────────────────
      validateTaskId(taskId);

      const security = securitySettings ?? DEFAULT_SECURITY_SETTINGS;

      const timestamp = String(Date.now());
      const sessionId = `agent-${taskId}-${timestamp}`;
      const rawCwd = subProjectPath ? join(projectPath, subProjectPath) : projectPath;

      // ── Security: validate working directory ────────────────────
      const cwd = resolve(rawCwd);
      validateWorkingDirectory(cwd, projectPath, security.workdirRestricted);

      // Create progress directory
      const progressDir = join(progressBaseDir, 'progress');
      mkdirSync(progressDir, { recursive: true });

      const progressFile = join(progressDir, `${taskId}.jsonl`);
      const logFile = join(progressDir, `${taskId}.log`);

      // Write Claude hooks config for progress tracking
      const { configPath: hooksConfigPath, originalContent: originalSettingsContent } =
        writeHooksConfig(taskId, projectPath, progressDir);

      // Create session record
      const session: AgentSession = {
        id: sessionId,
        taskId,
        pid: 0,
        status: 'spawning',
        phase,
        spawnedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        progressFile,
        logFile,
        hooksConfigPath,
        originalSettingsContent,
        exitCode: null,
        projectPath,
        command: prompt,
      };

      sessions.set(sessionId, session);

      // Open log file stream
      const logStream = createWriteStream(logFile, { flags: 'a' });
      logStreams.set(sessionId, logStream);

      // ── Security: scrub environment variables ───────────────────
      const scrubbedEnv = scrubEnvironment(security, env);

      // Spawn headless Claude agent
      const child = spawn('claude', ['-p', prompt], {
        cwd,
        stdio: 'pipe',
        detached: true,
        shell: true,
        env: scrubbedEnv,
      });

      const pid = child.pid ?? 0;
      updateSession(sessionId, { pid, status: 'active' });
      processes.set(sessionId, child);

      // Pipe stdout/stderr to log file
      child.stdout.on('data', (data: Buffer) => {
        logStream.write(data);
      });

      child.stderr.on('data', (data: Buffer) => {
        logStream.write(data);
      });

      emitEvent({
        type: 'spawned',
        session: { ...session, pid, status: 'active' },
        timestamp: new Date().toISOString(),
      });

      // Handle process exit
      child.on('exit', (code) => {
        const exitCode = code ?? -1;
        const status = exitCode === 0 ? 'completed' : 'error';

        updateSession(sessionId, { status, exitCode });
        processes.delete(sessionId);
        cleanupLogStream(sessionId);
        cleanupHooksConfig(session);

        // Emit event BEFORE cleaning up progress/log files so handlers
        // can still read the log (e.g., for plan file detection).
        const updatedSession = sessions.get(sessionId);
        if (updatedSession) {
          emitEvent({
            type: status === 'completed' ? 'completed' : 'error',
            session: updatedSession,
            timestamp: new Date().toISOString(),
            exitCode,
          });

          // Update milestone tasks on completion
          if (status === 'completed') {
            tryUpdateMilestones(updatedSession.taskId);
          }
        }

        cleanupProgressFiles(session);
      });

      child.on('error', (error) => {
        updateSession(sessionId, { status: 'error', exitCode: -1 });
        processes.delete(sessionId);
        cleanupLogStream(sessionId);
        cleanupHooksConfig(session);
        cleanupProgressFiles(session);

        const updatedSession = sessions.get(sessionId);
        if (updatedSession) {
          emitEvent({
            type: 'error',
            session: updatedSession,
            timestamp: new Date().toISOString(),
            error: error.message,
          });
        }
      });

      // Don't keep the parent process alive waiting for child
      child.unref();

      return Promise.resolve({ ...session, pid, status: 'active' });
    },

    sendInput(sessionId: string, data: string): void {
      const child = processes.get(sessionId);
      if (!child) {
        agentLogger.warn(`[AgentOrchestrator] sendInput: no active process for session ${sessionId}`);
        return;
      }
      if (!child.stdin || child.stdin.destroyed) {
        agentLogger.warn(`[AgentOrchestrator] sendInput: stdin unavailable for session ${sessionId}`);
        return;
      }
      child.stdin.write(data);
    },

    kill(sessionId: string): void {
      const child = processes.get(sessionId);
      const session = sessions.get(sessionId);

      if (!child || !session) {
        return;
      }

      updateSession(sessionId, { status: 'killed' });

      // Try graceful termination first
      try {
        if (process.platform === 'win32') {
          process.kill(session.pid);
        } else {
          process.kill(session.pid, 'SIGTERM');
        }
      } catch {
        // Process may already be gone
      }

      // Force kill after grace period
      setTimeout(() => {
        try {
          if (process.platform === 'win32') {
            process.kill(session.pid);
          } else {
            process.kill(session.pid, 'SIGKILL');
          }
        } catch {
          // Process already exited
        }
      }, KILL_GRACE_PERIOD_MS);

      const updatedSession = sessions.get(sessionId);
      if (updatedSession) {
        emitEvent({
          type: 'killed',
          session: updatedSession,
          timestamp: new Date().toISOString(),
        });
      }
    },

    getSession(sessionId: string): AgentSession | undefined {
      return sessions.get(sessionId);
    },

    getSessionByTaskId(taskId: string): AgentSession | undefined {
      for (const session of sessions.values()) {
        if (session.taskId === taskId && (session.status === 'active' || session.status === 'spawning')) {
          return session;
        }
      }
      return undefined;
    },

    listActiveSessions(): AgentSession[] {
      return [...sessions.values()].filter(
        (s) => s.status === 'active' || s.status === 'spawning',
      );
    },

    onSessionEvent(handler: AgentSessionEventHandler): void {
      eventHandlers.push(handler);
    },

    dispose(): void {
      // Kill all active sessions
      for (const [sessionId] of processes) {
        const session = sessions.get(sessionId);
        if (session) {
          try {
            if (process.platform === 'win32') {
              process.kill(session.pid);
            } else {
              process.kill(session.pid, 'SIGTERM');
            }
          } catch {
            // Process may already be gone
          }
        }
      }

      // Clean up log streams
      for (const [sessionId] of logStreams) {
        cleanupLogStream(sessionId);
      }

      processes.clear();
      sessions.clear();
      eventHandlers.length = 0;
    },
  };
}
