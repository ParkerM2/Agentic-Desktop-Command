/**
 * Agent Queue — Priority FIFO Queue for Agent Execution
 *
 * Manages queued agents with configurable max concurrency.
 * Agents are dequeued by priority (higher = more priority),
 * with FIFO ordering within the same priority level.
 */

import type { IpcRouter } from '../../ipc/router';

export interface QueuedAgent {
  id: string;
  taskId: string;
  projectId: string;
  priority: number;
  queuedAt: string;
}

export interface AgentQueueStatus {
  pending: QueuedAgent[];
  running: string[];
  maxConcurrent: number;
}

export interface AgentQueue {
  enqueue: (taskId: string, projectId: string, priority?: number) => string;
  dequeue: () => QueuedAgent | null;
  remove: (id: string) => boolean;
  getQueueStatus: () => AgentQueueStatus;
  setMaxConcurrent: (n: number) => void;
  getMaxConcurrent: () => number;
  getRunningCount: () => number;
  addRunning: (id: string) => void;
  removeRunning: (id: string) => void;
  canStartImmediately: () => boolean;
}

const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_PRIORITY = 0;

/**
 * Create an agent queue instance.
 *
 * @param router - IPC router for emitting queue change events
 * @param initialMaxConcurrent - Initial max concurrent agents (defaults to 2)
 */
export function createAgentQueue(router: IpcRouter, initialMaxConcurrent?: number): AgentQueue {
  const pending: QueuedAgent[] = [];
  const running = new Set<string>();
  let maxConcurrent = initialMaxConcurrent ?? DEFAULT_MAX_CONCURRENT;
  let idCounter = 0;

  function emitQueueChanged(): void {
    router.emit('event:agent.queueChanged', {
      pending: pending.length,
      running: running.size,
      maxConcurrent,
    });
  }

  return {
    enqueue(taskId, projectId, priority = DEFAULT_PRIORITY) {
      idCounter += 1;
      const id = `queued-${String(Date.now())}-${String(idCounter)}`;
      const queuedAgent: QueuedAgent = {
        id,
        taskId,
        projectId,
        priority,
        queuedAt: new Date().toISOString(),
      };
      pending.push(queuedAgent);
      emitQueueChanged();
      return id;
    },

    dequeue() {
      if (pending.length === 0) {
        return null;
      }

      // Sort by priority descending, then by queuedAt ascending (FIFO within priority)
      pending.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.queuedAt.localeCompare(b.queuedAt);
      });

      const next = pending.shift();
      if (next) {
        emitQueueChanged();
        return next;
      }
      return null;
    },

    remove(id) {
      const index = pending.findIndex((q) => q.id === id);
      if (index === -1) {
        return false;
      }
      pending.splice(index, 1);
      emitQueueChanged();
      return true;
    },

    getQueueStatus() {
      return {
        pending: [...pending],
        running: [...running],
        maxConcurrent,
      };
    },

    setMaxConcurrent(n) {
      maxConcurrent = Math.max(1, n);
      emitQueueChanged();
    },

    getMaxConcurrent() {
      return maxConcurrent;
    },

    getRunningCount() {
      return running.size;
    },

    addRunning(id) {
      running.add(id);
      emitQueueChanged();
    },

    removeRunning(id) {
      running.delete(id);
      emitQueueChanged();
    },

    canStartImmediately() {
      return running.size < maxConcurrent;
    },
  };
}
