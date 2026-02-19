/**
 * Agent Orchestrator — Headless Claude agent lifecycle manager
 *
 * Replaces the fire-and-forget TaskLauncher with proper lifecycle
 * management: spawns agents, tracks PIDs, writes hooks configs,
 * monitors for exit events, and emits session events.
 */

import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
import type { ChildProcess } from 'node:child_process';
import type { WriteStream } from 'node:fs';

const KILL_GRACE_PERIOD_MS = 5000;

export function createAgentOrchestrator(
  progressBaseDir: string,
  milestonesService?: MilestonesService,
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
      const { taskId, projectPath, subProjectPath, prompt, phase, env } = options;

      const timestamp = String(Date.now());
      const sessionId = `agent-${taskId}-${timestamp}`;
      const cwd = subProjectPath ? join(projectPath, subProjectPath) : projectPath;

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

      // Spawn headless Claude agent
      const child = spawn('claude', ['-p', prompt], {
        cwd,
        stdio: 'pipe',
        detached: true,
        shell: true,
        env: { ...process.env, ...env },
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

    kill(sessionId: string): void {
      const child = processes.get(sessionId);
      const session = sessions.get(sessionId);

      if (!child || !session) {
        return;
      }

      updateSession(sessionId, { status: 'killed' });

      // Try graceful termination first
      try {
        process.kill(session.pid, 'SIGTERM');
      } catch {
        // Process may already be gone
      }

      // Force kill after grace period
      setTimeout(() => {
        try {
          process.kill(session.pid, 'SIGKILL');
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
            process.kill(session.pid, 'SIGTERM');
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
