/**
 * Agent Service — Claude CLI Process Management
 *
 * Spawns and manages Claude CLI agents for task execution.
 * Agents run in dedicated terminals and their output is parsed
 * for status updates, progress, and logs.
 */

import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { join } from 'node:path';

import * as pty from '@lydell/node-pty';

import {
  AUTO_CLAUDE_DIR,
  SPECS_DIR,
  STATUS_RUNNING_PATTERNS,
  STATUS_COMPLETED_PATTERNS,
  STATUS_ERROR_PATTERNS,
  PROGRESS_PATTERNS,
} from '@shared/constants';
import type { AgentSession, AgentStatus } from '@shared/types';

import type { AgentQueue, AgentQueueStatus, QueuedAgent } from './agent-queue';
import type { IpcRouter } from '../../ipc/router';


interface AgentProcess {
  session: AgentSession;
  pty: pty.IPty;
  outputBuffer: string[];
  isPaused: boolean;
}

export interface StartAgentResult {
  session: AgentSession | null;
  queued: QueuedAgent | null;
}

export interface AgentService {
  listAgents: (projectId: string) => AgentSession[];
  listAllAgents: () => AgentSession[];
  startAgent: (taskId: string, projectId: string, cwd: string, priority?: number) => StartAgentResult;
  stopAgent: (agentId: string) => { success: boolean };
  pauseAgent: (agentId: string) => { success: boolean };
  resumeAgent: (agentId: string) => { success: boolean };
  getQueueStatus: () => AgentQueueStatus;
  removeFromQueue: (queuedId: string) => { success: boolean };
  processQueue: () => void;
  dispose: () => void;
}

type ProjectResolver = (projectId: string) => string | undefined;

function getShell(): string {
  if (platform() === 'win32') {
    const pwsh7 = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
    if (existsSync(pwsh7)) return pwsh7;
    return process.env.COMSPEC ?? 'cmd.exe';
  }
  return process.env.SHELL ?? '/bin/bash';
}

/**
 * Parse Claude CLI output for status/progress indicators.
 * Returns event data if a status pattern is matched.
 */
function matchesAny(line: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => line.includes(p));
}

function parseClaudeOutput(
  line: string,
): { type: 'status' | 'log' | 'progress'; data: Record<string, unknown> } | null {
  if (matchesAny(line, STATUS_RUNNING_PATTERNS)) {
    return { type: 'status', data: { status: 'running' } };
  }
  if (matchesAny(line, STATUS_COMPLETED_PATTERNS)) {
    return { type: 'status', data: { status: 'completed' } };
  }
  if (matchesAny(line, STATUS_ERROR_PATTERNS)) {
    return { type: 'status', data: { status: 'error' } };
  }
  if (matchesAny(line, PROGRESS_PATTERNS)) {
    return { type: 'progress', data: { message: line } };
  }
  // Generic log
  if (line.trim().length > 0) {
    return { type: 'log', data: { message: line } };
  }
  return null;
}

export function createAgentService(
  router: IpcRouter,
  resolveProject: ProjectResolver,
  queue: AgentQueue,
): AgentService {
  const agents = new Map<string, AgentProcess>();

  function emitStatus(agentId: string, status: AgentStatus, taskId: string): void {
    router.emit('event:agent.statusChanged', { agentId, status, taskId });
  }

  function emitLog(agentId: string, message: string): void {
    router.emit('event:agent.log', { agentId, message });
  }

  /**
   * Internal function to actually spawn an agent process.
   * Called when there's capacity or when processing the queue.
   */
  function spawnAgent(taskId: string, projectId: string, cwd: string): AgentSession {
    const id = `agent-${taskId}-${String(Date.now())}`;
    const shell = getShell();

    // Resolve working directory
    let workDir = cwd;
    const projectPath = resolveProject(projectId);
    if (!workDir && projectPath) {
      workDir = projectPath;
    }
    if (!workDir || !existsSync(workDir)) {
      workDir = process.env.HOME ?? process.env.USERPROFILE ?? '.';
    }

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: workDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      } as Record<string, string>,
    });

    const session: AgentSession = {
      id,
      taskId,
      projectId,
      status: 'idle',
      worktreePath: workDir,
      startedAt: new Date().toISOString(),
    };

    const agentProc: AgentProcess = {
      session,
      pty: ptyProcess,
      outputBuffer: [],
      isPaused: false,
    };

    // Parse PTY output for status events
    ptyProcess.onData((data: string) => {
      if (agentProc.isPaused) return;

      const lines = data.split('\n');
      for (const line of lines) {
        const parsed = parseClaudeOutput(line);
        if (parsed) {
          if (parsed.type === 'status') {
            const newStatus = parsed.data.status as AgentStatus;
            session.status = newStatus;
            emitStatus(id, newStatus, taskId);
            if (newStatus === 'completed') {
              session.completedAt = new Date().toISOString();
            }
          } else if (parsed.type === 'log') {
            agentProc.outputBuffer.push(parsed.data.message as string);
            emitLog(id, parsed.data.message as string);
          }
        }
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode }) => {
      if (session.status !== 'completed' && session.status !== 'error') {
        session.status = exitCode === 0 ? 'completed' : 'error';
        session.completedAt = new Date().toISOString();
        emitStatus(id, session.status, taskId);
      }
      agents.delete(id);
      queue.removeRunning(id);

      // Process queue after an agent completes
      processQueueInternal();
    });

    agents.set(id, agentProc);
    queue.addRunning(id);

    // Start the agent by invoking Claude CLI
    // Send the claude command after a brief delay for shell init
    setTimeout(() => {
      // Construct the claude command with the task context
      const specDir = join(workDir, AUTO_CLAUDE_DIR, SPECS_DIR, taskId);
      const claudeCmd = existsSync(specDir) ? `claude --task "${taskId}"\r` : `claude\r`;
      ptyProcess.write(claudeCmd);
      session.status = 'running';
      emitStatus(id, 'running', taskId);
    }, 500);

    return session;
  }

  /**
   * Process the queue, starting agents if there's capacity.
   */
  function processQueueInternal(): void {
    while (queue.canStartImmediately()) {
      const next = queue.dequeue();
      if (!next) break;

      const projectPath = resolveProject(next.projectId);
      spawnAgent(next.taskId, next.projectId, projectPath ?? '');
    }
  }

  return {
    listAgents(projectId) {
      const sessions: AgentSession[] = [];
      for (const proc of agents.values()) {
        if (proc.session.projectId === projectId) {
          sessions.push(proc.session);
        }
      }
      return sessions;
    },

    listAllAgents() {
      return [...agents.values()].map((proc) => proc.session);
    },

    startAgent(taskId, projectId, cwd, priority = 0) {
      // Check if we can start immediately
      if (queue.canStartImmediately()) {
        const session = spawnAgent(taskId, projectId, cwd);
        return { session, queued: null };
      }

      // Queue the agent for later execution
      const queuedId = queue.enqueue(taskId, projectId, priority);
      const queueStatus = queue.getQueueStatus();
      const queuedAgent = queueStatus.pending.find((q) => q.id === queuedId);

      return { session: null, queued: queuedAgent ?? null };
    },

    stopAgent(agentId) {
      const proc = agents.get(agentId);
      if (!proc) return { success: false };

      try {
        proc.pty.kill();
      } catch {
        // Already dead
      }

      proc.session.status = 'error';
      proc.session.completedAt = new Date().toISOString();
      emitStatus(agentId, 'error', proc.session.taskId);
      agents.delete(agentId);
      queue.removeRunning(agentId);

      // Process queue after stopping an agent
      processQueueInternal();

      return { success: true };
    },

    pauseAgent(agentId) {
      const proc = agents.get(agentId);
      if (!proc) return { success: false };

      proc.isPaused = true;
      proc.session.status = 'paused';
      emitStatus(agentId, 'paused', proc.session.taskId);

      // Send Ctrl+Z to pause the process (Unix) or do nothing on Windows
      if (platform() !== 'win32') {
        proc.pty.write('\x1A'); // Ctrl+Z
      }

      return { success: true };
    },

    resumeAgent(agentId) {
      const proc = agents.get(agentId);
      if (!proc) return { success: false };

      proc.isPaused = false;
      proc.session.status = 'running';
      emitStatus(agentId, 'running', proc.session.taskId);

      // Send fg command to resume (Unix)
      if (platform() !== 'win32') {
        proc.pty.write('fg\r');
      }

      return { success: true };
    },

    getQueueStatus() {
      return queue.getQueueStatus();
    },

    removeFromQueue(queuedId) {
      const removed = queue.remove(queuedId);
      return { success: removed };
    },

    processQueue() {
      processQueueInternal();
    },

    dispose() {
      for (const [_id, proc] of agents) {
        try {
          proc.pty.kill();
        } catch {
          // Ignore
        }
      }
      agents.clear();
    },
  };
}
