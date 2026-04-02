/**
 * Subprocess Strategy — Default connection strategy using child_process.spawn
 *
 * Wraps the existing ProcessManager to implement AgentConnectionStrategy.
 * Pure refactor — no new behavior, delegates all operations to ProcessManager.
 */

import type {
  AgentConnectionStatus,
  AgentConnectionStrategy,
  AgentSpawnConfig,
  AgentSpawnResult,
} from './agent-connection-strategy';
import type { ManagedProcess, ProcessManager } from './process-manager';

export class SubprocessStrategy implements AgentConnectionStrategy {
  private readonly processManager: ProcessManager;
  private readonly processes = new Map<number, ManagedProcess>();

  constructor(processManager: ProcessManager) {
    this.processManager = processManager;
  }

  spawn(config: AgentSpawnConfig): AgentSpawnResult {
    const managed = this.processManager.spawn({
      cwd: config.cwd,
      prompt: config.prompt,
      model: config.model,
      name: config.name,
    });

    this.processes.set(managed.pid, managed);

    const events = this.processManager.events(managed);

    return {
      pid: managed.pid,
      alive: managed.alive,
      write: (data: string) => this.processManager.sendMessage(managed, data),
      kill: () => {
        this.processManager.kill(managed);
      },
      isAlive: () => this.processManager.isAlive(managed),
      onStdout: events.onStdout,
      onStderr: events.onStderr,
      onExit: events.onExit,
      onError: events.onError,
    };
  }

  sendMessage(pid: number, message: string): boolean {
    const managed = this.processes.get(pid);
    if (!managed) {
      return false;
    }
    return this.processManager.sendMessage(managed, message);
  }

  terminate(pid: number): void {
    const managed = this.processes.get(pid);
    if (managed) {
      this.processManager.kill(managed);
    }
  }

  getStatus(pid: number): AgentConnectionStatus {
    const managed = this.processes.get(pid);
    if (!managed) {
      return 'disconnected';
    }
    return this.processManager.isAlive(managed) ? 'connected' : 'disconnected';
  }
}
