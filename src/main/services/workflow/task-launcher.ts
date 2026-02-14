/**
 * Task Launcher — Spawn Claude CLI for task execution
 *
 * Launches `claude` CLI with `-p` flag and task prompt,
 * tracks running sessions, and provides lifecycle management.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';

export interface LaunchResult {
  sessionId: string;
  pid: number;
}

export interface TaskLauncherService {
  launch: (taskDescription: string, projectPath: string, subProjectPath?: string) => LaunchResult;
  isRunning: (sessionId: string) => boolean;
  stop: (sessionId: string) => boolean;
}

interface RunningSession {
  pid: number;
  startedAt: string;
}

export function createTaskLauncher(): TaskLauncherService {
  const sessions = new Map<string, RunningSession>();

  return {
    launch(taskDescription, projectPath, subProjectPath) {
      const sessionId = `wf-${String(Date.now())}-${String(Math.random()).slice(2, 8)}`;
      const cwd = subProjectPath ? join(projectPath, subProjectPath) : projectPath;

      const child = spawn('claude', ['-p', taskDescription], {
        cwd,
        stdio: 'ignore',
        detached: true,
        shell: true,
      });

      child.unref();

      const pid = child.pid ?? 0;

      sessions.set(sessionId, {
        pid,
        startedAt: new Date().toISOString(),
      });

      // Clean up session when process exits
      child.on('exit', () => {
        sessions.delete(sessionId);
      });

      child.on('error', () => {
        sessions.delete(sessionId);
      });

      return { sessionId, pid };
    },

    isRunning(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) return false;

      try {
        process.kill(session.pid, 0);
        return true;
      } catch {
        sessions.delete(sessionId);
        return false;
      }
    },

    stop(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) return false;

      try {
        process.kill(session.pid, 'SIGTERM');
        sessions.delete(sessionId);
        return true;
      } catch {
        sessions.delete(sessionId);
        return false;
      }
    },
  };
}
