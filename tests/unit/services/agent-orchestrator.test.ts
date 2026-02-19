/**
 * Unit Tests for AgentOrchestrator
 *
 * Tests agent spawning, session management, event emission, kill behavior,
 * and disposal. Mocks child_process.spawn, node:fs, and hooks-template.
 */

import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChildProcess } from 'node:child_process';
import type {
  AgentSession,
  AgentSessionEvent,
  SpawnOptions,
} from '@main/services/agent-orchestrator/types';

// ── Mock child_process ──────────────────────────────────────────

class MockChildProcess extends EventEmitter {
  pid = 99999;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  unref = vi.fn();
}

let lastSpawnedChild: MockChildProcess | null = null;

const mockSpawn = vi.fn((..._args: unknown[]) => {
  const child = new MockChildProcess();
  lastSpawnedChild = child;
  return child as unknown as ChildProcess;
});

vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// ── Mock node:fs ────────────────────────────────────────────────

const mockMkdirSync = vi.fn((..._args: unknown[]) => undefined);
const mockUnlinkSync = vi.fn((..._args: unknown[]) => undefined);
const mockWriteFileSync = vi.fn((..._args: unknown[]) => undefined);
const mockCreateWriteStream = vi.fn((..._args: unknown[]) => ({
  write: vi.fn(),
  end: vi.fn(),
}));

vi.mock('node:fs', () => ({
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  unlinkSync: (...args: unknown[]) => mockUnlinkSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  createWriteStream: (...args: unknown[]) => mockCreateWriteStream(...args),
}));

// ── Mock hooks-template ─────────────────────────────────────────

const mockWriteHooksConfig = vi.fn((..._args: unknown[]) => ({
  configPath: '/mock/project/.claude/settings.local.json',
  originalContent: null,
}));

vi.mock('@main/services/agent-orchestrator/hooks-template', () => ({
  writeHooksConfig: (...args: unknown[]) => mockWriteHooksConfig(...args),
}));

// ── Import after mocks ─────────────────────────────────────────

const { createAgentOrchestrator } = await import(
  '@main/services/agent-orchestrator/agent-orchestrator'
);

// ── Helpers ─────────────────────────────────────────────────────

const PROGRESS_BASE_DIR = '/mock/progress-base';

function makeSpawnOptions(overrides: Partial<SpawnOptions> = {}): SpawnOptions {
  return {
    taskId: 'task-001',
    projectPath: '/mock/project',
    prompt: 'Implement feature X',
    phase: 'planning',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('AgentOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastSpawnedChild = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── spawn() ───────────────────────────────────────────────

  describe('spawn()', () => {
    it('creates a session with correct initial properties', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      const session = await orchestrator.spawn(makeSpawnOptions());

      expect(session.taskId).toBe('task-001');
      expect(session.status).toBe('active');
      expect(session.pid).toBe(99999);
      expect(session.phase).toBe('planning');
      expect(session.projectPath).toBe('/mock/project');
      expect(session.command).toBe('Implement feature X');
      expect(session.exitCode).toBeNull();

      orchestrator.dispose();
    });

    it('generates a unique session ID containing taskId', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      const session = await orchestrator.spawn(makeSpawnOptions());

      expect(session.id).toContain('agent-task-001-');

      orchestrator.dispose();
    });

    it('calls child_process.spawn with correct arguments', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions());

      expect(mockSpawn).toHaveBeenCalledTimes(1);

      const call = mockSpawn.mock.calls[0] as unknown as [
        string,
        string[],
        Record<string, unknown>,
      ];
      const [cmd, args, options] = call;
      expect(cmd).toBe('claude');
      expect(args).toEqual(['-p', 'Implement feature X']);
      expect(options.cwd).toBe('/mock/project');
      expect(options.shell).toBe(true);
      expect(options.detached).toBe(true);
      expect(options.stdio).toBe('pipe');

      orchestrator.dispose();
    });

    it('uses subProjectPath to build cwd when provided', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(
        makeSpawnOptions({
          projectPath: '/mock/project',
          subProjectPath: 'packages/core',
        }),
      );

      const subCall = mockSpawn.mock.calls[0] as unknown as [
        string,
        string[],
        Record<string, unknown>,
      ];
      // node:path.join('/mock/project', 'packages/core')
      expect(subCall[2].cwd).toContain('packages');

      orchestrator.dispose();
    });

    it('merges env variables into process.env', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(
        makeSpawnOptions({
          env: { CUSTOM_VAR: 'custom_value' },
        }),
      );

      const call = mockSpawn.mock.calls[0] as unknown as [
        string,
        string[],
        { env: Record<string, string> },
      ];
      const [, , options] = call;
      expect(options.env['CUSTOM_VAR']).toBe('custom_value');

      orchestrator.dispose();
    });

    it('creates progress directory via mkdirSync', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions());

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('progress'),
        { recursive: true },
      );

      orchestrator.dispose();
    });

    it('writes hooks config for progress tracking', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions({ taskId: 'task-hooks' }));

      expect(mockWriteHooksConfig).toHaveBeenCalledTimes(1);
      expect(mockWriteHooksConfig).toHaveBeenCalledWith(
        'task-hooks',
        '/mock/project',
        expect.stringContaining('progress'),
      );

      orchestrator.dispose();
    });

    it('opens a log file write stream', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions());

      expect(mockCreateWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('task-001.log'),
        { flags: 'a' },
      );

      orchestrator.dispose();
    });

    it('unrefs the child process to not block parent exit', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions());

      expect(lastSpawnedChild?.unref).toHaveBeenCalled();

      orchestrator.dispose();
    });
  });

  // ── Event emission ────────────────────────────────────────

  describe('event emission', () => {
    it('emits spawned event on successful spawn', async () => {
      const events: AgentSessionEvent[] = [];
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      orchestrator.onSessionEvent((event) => {
        events.push(event);
      });

      await orchestrator.spawn(makeSpawnOptions());

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('spawned');
      expect(events[0]?.session.status).toBe('active');

      orchestrator.dispose();
    });

    it('emits completed event when child exits with code 0', async () => {
      const events: AgentSessionEvent[] = [];
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      orchestrator.onSessionEvent((event) => {
        events.push(event);
      });

      await orchestrator.spawn(makeSpawnOptions());

      // Simulate child process exit
      lastSpawnedChild?.emit('exit', 0);

      const completedEvent = events.find((e) => e.type === 'completed');
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.exitCode).toBe(0);

      orchestrator.dispose();
    });

    it('emits error event when child exits with non-zero code', async () => {
      const events: AgentSessionEvent[] = [];
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      orchestrator.onSessionEvent((event) => {
        events.push(event);
      });

      await orchestrator.spawn(makeSpawnOptions());

      lastSpawnedChild?.emit('exit', 1);

      const errorEvent = events.find((e) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.exitCode).toBe(1);

      orchestrator.dispose();
    });

    it('emits error event when child process errors', async () => {
      const events: AgentSessionEvent[] = [];
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      orchestrator.onSessionEvent((event) => {
        events.push(event);
      });

      await orchestrator.spawn(makeSpawnOptions());

      lastSpawnedChild?.emit('error', new Error('spawn ENOENT'));

      const errorEvent = events.find((e) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.error).toBe('spawn ENOENT');

      orchestrator.dispose();
    });

    it('catches and logs errors thrown by event handlers', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);

      orchestrator.onSessionEvent(() => {
        throw new Error('handler error');
      });

      await orchestrator.spawn(makeSpawnOptions());

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AgentOrchestrator] Event handler error:',
        'handler error',
      );

      consoleSpy.mockRestore();
      orchestrator.dispose();
    });
  });

  // ── Session management ────────────────────────────────────

  describe('session management', () => {
    it('getSession returns the session by ID', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      const session = await orchestrator.spawn(makeSpawnOptions());

      const retrieved = orchestrator.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.taskId).toBe('task-001');

      orchestrator.dispose();
    });

    it('getSession returns undefined for unknown ID', () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);

      expect(orchestrator.getSession('nonexistent')).toBeUndefined();

      orchestrator.dispose();
    });

    it('getSessionByTaskId returns active session for a task', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions({ taskId: 'task-lookup' }));

      const session = orchestrator.getSessionByTaskId('task-lookup');

      expect(session).toBeDefined();
      expect(session?.taskId).toBe('task-lookup');
      expect(session?.status).toBe('active');

      orchestrator.dispose();
    });

    it('getSessionByTaskId returns undefined for unknown task', () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);

      expect(orchestrator.getSessionByTaskId('unknown-task')).toBeUndefined();

      orchestrator.dispose();
    });

    it('getSessionByTaskId does not return completed sessions', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions({ taskId: 'done-task' }));

      // Simulate process completion
      lastSpawnedChild?.emit('exit', 0);

      const session = orchestrator.getSessionByTaskId('done-task');

      expect(session).toBeUndefined();

      orchestrator.dispose();
    });

    it('listActiveSessions returns only active/spawning sessions', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);

      // Spawn two sessions
      const children: MockChildProcess[] = [];

      await orchestrator.spawn(makeSpawnOptions({ taskId: 'active-1' }));
      if (lastSpawnedChild) {
        children.push(lastSpawnedChild);
      }

      await orchestrator.spawn(makeSpawnOptions({ taskId: 'active-2' }));

      // Complete the first one
      children[0]?.emit('exit', 0);

      const activeSessions = orchestrator.listActiveSessions();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0]?.taskId).toBe('active-2');

      orchestrator.dispose();
    });
  });

  // ── kill() ────────────────────────────────────────────────

  describe('kill()', () => {
    it('sends SIGTERM to the process', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      const session = await orchestrator.spawn(makeSpawnOptions());

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      orchestrator.kill(session.id);

      expect(killSpy).toHaveBeenCalledWith(99999, 'SIGTERM');

      killSpy.mockRestore();
      orchestrator.dispose();
    });

    it('emits killed event', async () => {
      const events: AgentSessionEvent[] = [];
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      orchestrator.onSessionEvent((event) => {
        events.push(event);
      });

      const session = await orchestrator.spawn(makeSpawnOptions());

      vi.spyOn(process, 'kill').mockImplementation(() => true);

      orchestrator.kill(session.id);

      const killedEvent = events.find((e) => e.type === 'killed');
      expect(killedEvent).toBeDefined();
      expect(killedEvent?.session.status).toBe('killed');

      vi.restoreAllMocks();
      orchestrator.dispose();
    });

    it('is a no-op for unknown session ID', () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);

      // Should not throw
      expect(() => {
        orchestrator.kill('nonexistent');
      }).not.toThrow();

      orchestrator.dispose();
    });

    it('handles process already being gone gracefully', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      const session = await orchestrator.spawn(makeSpawnOptions());

      vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('ESRCH');
      });

      // Should not throw
      expect(() => {
        orchestrator.kill(session.id);
      }).not.toThrow();

      vi.restoreAllMocks();
      orchestrator.dispose();
    });
  });

  // ── dispose() ─────────────────────────────────────────────

  describe('dispose()', () => {
    it('attempts to kill all active sessions', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions({ taskId: 'dispose-1' }));
      await orchestrator.spawn(makeSpawnOptions({ taskId: 'dispose-2' }));

      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

      orchestrator.dispose();

      // Should have sent SIGTERM to both
      expect(killSpy).toHaveBeenCalledWith(99999, 'SIGTERM');
      expect(killSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      killSpy.mockRestore();
    });

    it('clears all sessions after dispose', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions());

      vi.spyOn(process, 'kill').mockImplementation(() => true);

      orchestrator.dispose();

      expect(orchestrator.listActiveSessions()).toEqual([]);

      vi.restoreAllMocks();
    });

    it('can be called safely even with no sessions', () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);

      expect(() => {
        orchestrator.dispose();
      }).not.toThrow();
    });
  });

  // ── Exit cleanup ──────────────────────────────────────────

  describe('exit cleanup', () => {
    it('updates session status to completed on exit code 0', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      const session = await orchestrator.spawn(makeSpawnOptions());

      lastSpawnedChild?.emit('exit', 0);

      const updatedSession = orchestrator.getSession(session.id);

      expect(updatedSession?.status).toBe('completed');
      expect(updatedSession?.exitCode).toBe(0);

      orchestrator.dispose();
    });

    it('updates session status to error on non-zero exit code', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      const session = await orchestrator.spawn(makeSpawnOptions());

      lastSpawnedChild?.emit('exit', 1);

      const updatedSession = orchestrator.getSession(session.id);

      expect(updatedSession?.status).toBe('error');
      expect(updatedSession?.exitCode).toBe(1);

      orchestrator.dispose();
    });

    it('treats null exit code as -1', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      const session = await orchestrator.spawn(makeSpawnOptions());

      lastSpawnedChild?.emit('exit', null);

      const updatedSession = orchestrator.getSession(session.id);

      expect(updatedSession?.exitCode).toBe(-1);
      expect(updatedSession?.status).toBe('error');

      orchestrator.dispose();
    });

    it('cleans up progress files after exit', async () => {
      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions());

      lastSpawnedChild?.emit('exit', 0);

      // unlinkSync called for hooksConfigPath (cleanup), progressFile, and logFile
      expect(mockUnlinkSync).toHaveBeenCalledTimes(3);

      orchestrator.dispose();
    });

    it('handles cleanup errors gracefully when files are already gone', async () => {
      mockUnlinkSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const orchestrator = createAgentOrchestrator(PROGRESS_BASE_DIR);
      await orchestrator.spawn(makeSpawnOptions());

      // Should not throw
      expect(() => {
        lastSpawnedChild?.emit('exit', 0);
      }).not.toThrow();

      mockUnlinkSync.mockReset();
      orchestrator.dispose();
    });
  });
});
