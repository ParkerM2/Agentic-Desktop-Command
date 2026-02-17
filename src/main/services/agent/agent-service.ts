/**
 * Agent Service — Claude CLI Process Management (Public API + Orchestration)
 *
 * @deprecated Use workflow/task-launcher.ts instead. This legacy agent service
 * spawns PTY-based agents. The new TaskLauncher uses detached child_process
 * for simpler lifecycle management. Kept for backward compatibility.
 */

import { platform } from 'node:os';

import type { AgentSession, AgentStatus, AggregatedTokenUsage, TokenUsage } from '@shared/types';

import { spawnAgent } from './agent-spawner';

import type { AgentQueue, AgentQueueStatus, QueuedAgent } from './agent-queue';
import type { AgentProcess } from './agent-spawner';
import type { IpcRouter } from '../../ipc/router';

export interface StartAgentResult {
  session: AgentSession | null;
  queued: QueuedAgent | null;
}

export interface AgentService {
  listAgents: (projectId: string) => AgentSession[];
  listAllAgents: () => AgentSession[];
  startAgent: (
    taskId: string,
    projectId: string,
    cwd: string,
    priority?: number,
  ) => StartAgentResult;
  stopAgent: (agentId: string) => { success: boolean };
  pauseAgent: (agentId: string) => { success: boolean };
  resumeAgent: (agentId: string) => { success: boolean };
  getQueueStatus: () => AgentQueueStatus;
  removeFromQueue: (queuedId: string) => { success: boolean };
  processQueue: () => void;
  getAggregatedTokenUsage: () => AggregatedTokenUsage;
  dispose: () => void;
}

type ProjectResolver = (projectId: string) => string | undefined;

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

  function emitTokenUsage(agentId: string, usage: TokenUsage): void {
    router.emit('event:agent.tokenUsage', { agentId, usage });
  }

  /**
   * Process the queue, starting agents if there's capacity.
   */
  function processQueueInternal(): void {
    while (queue.canStartImmediately()) {
      const next = queue.dequeue();
      if (!next) break;

      const projectPath = resolveProject(next.projectId);
      spawnAgentInternal(next.taskId, next.projectId, projectPath ?? '');
    }
  }

  /**
   * Internal wrapper around spawnAgent that wires up dependencies.
   */
  function spawnAgentInternal(taskId: string, projectId: string, cwd: string): AgentSession {
    const session = spawnAgent(taskId, projectId, cwd, {
      agents,
      resolveProject,
      emitStatus,
      emitLog,
      emitTokenUsage,
      onExit(agentId) {
        queue.removeRunning(agentId);
        processQueueInternal();
      },
    });

    queue.addRunning(session.id);
    return session;
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
      if (queue.canStartImmediately()) {
        const session = spawnAgentInternal(taskId, projectId, cwd);
        return { session, queued: null };
      }

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

      processQueueInternal();

      return { success: true };
    },

    pauseAgent(agentId) {
      const proc = agents.get(agentId);
      if (!proc) return { success: false };

      proc.isPaused = true;
      proc.session.status = 'paused';
      emitStatus(agentId, 'paused', proc.session.taskId);

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

    getAggregatedTokenUsage() {
      const byAgent: AggregatedTokenUsage['byAgent'] = [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCostUsd = 0;

      for (const proc of agents.values()) {
        const { session } = proc;
        if (session.tokenUsage) {
          totalInputTokens += session.tokenUsage.inputTokens;
          totalOutputTokens += session.tokenUsage.outputTokens;
          totalCostUsd += session.tokenUsage.estimatedCostUsd;
          byAgent.push({
            agentId: session.id,
            taskId: session.taskId,
            projectId: session.projectId,
            usage: session.tokenUsage,
          });
        }
      }

      return {
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
        byAgent,
      };
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
