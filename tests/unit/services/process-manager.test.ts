/**
 * Unit Tests for Process Manager
 *
 * Tests process spawning, message sending, killing, alive checks, and event registration.
 * Mocks child_process.spawn and the logger to avoid real process spawning.
 */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChildProcess } from 'node:child_process';

// ── Mock Logger ─────────────────────────────────────────────────────

vi.mock('@main/lib/logger', () => ({
  agentLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock child_process.spawn ────────────────────────────────────────

function createMockChildProcess(pid = 12345): ChildProcess {
  const emitter = new EventEmitter();
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  const child = Object.assign(emitter, {
    stdin,
    stdout,
    stderr,
    pid,
    kill: vi.fn(),
    connected: true,
    exitCode: null,
    signalCode: null,
    killed: false,
    spawnargs: [],
    spawnfile: '',
    stdio: [stdin, stdout, stderr, null, null] as ChildProcess['stdio'],
    ref: vi.fn(),
    unref: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    [Symbol.dispose]: vi.fn(),
  }) as unknown as ChildProcess;

  return child;
}

const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Import after mocks
const { createProcessManager } = await import(
  '@main/services/agent-manager/process-manager'
);

// ── Tests ───────────────────────────────────────────────────────────

describe('ProcessManager', () => {
  let mockChild: ChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChild = createMockChildProcess(12345);
    mockSpawn.mockReturnValue(mockChild);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── spawn() ───────────────────────────────────────────────────

  describe('spawn()', () => {
    it('spawns a child process with stream-json flags', () => {
      const pm = createProcessManager();
      pm.spawn({
        cwd: '/project',
        prompt: 'Hello',
      });

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const [cmd, args] = mockSpawn.mock.calls[0] as [string, string[]];
      expect(cmd).toBe('claude');
      expect(args).toContain('-p');
      expect(args).toContain('--input-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args).toContain('--verbose');
    });

    it('returns a ManagedProcess with correct properties', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({
        cwd: '/project',
        prompt: 'Hello',
      });

      expect(managed.pid).toBe(12345);
      expect(managed.alive).toBe(true);
      expect(managed.process).toBe(mockChild);
      expect(managed.spawnedAt).toBeInstanceOf(Date);
      expect(managed.lastActivityAt).toBeInstanceOf(Date);
    });

    it('sends initial prompt to stdin', () => {
      const pm = createProcessManager();
      const writeSpy = vi.spyOn(mockChild.stdin!, 'write');

      pm.spawn({
        cwd: '/project',
        prompt: 'Build the feature',
      });

      expect(writeSpy).toHaveBeenCalledTimes(1);
      const written = writeSpy.mock.calls[0]?.[0] as unknown as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.type).toBe('user');
      expect(parsed.message.role).toBe('user');
      expect(parsed.message.content).toBe('Build the feature');
    });

    it('does not send empty prompt', () => {
      const pm = createProcessManager();
      const writeSpy = vi.spyOn(mockChild.stdin!, 'write');

      pm.spawn({
        cwd: '/project',
        prompt: '',
      });

      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('includes model flag when specified', () => {
      const pm = createProcessManager();
      pm.spawn({
        cwd: '/project',
        prompt: 'Hello',
        model: 'claude-sonnet-4-6',
      });

      const args = mockSpawn.mock.calls[0][1] as string[];
      const modelIdx = args.indexOf('--model');
      expect(modelIdx).toBeGreaterThan(-1);
      expect(args[modelIdx + 1]).toBe('claude-sonnet-4-6');
    });

    it('includes agent flags when specified', () => {
      const pm = createProcessManager();
      pm.spawn({
        cwd: '/project',
        prompt: 'Hello',
        agentFlags: {
          agentId: 'coder@my-team',
          teamName: 'my-team',
          agentType: 'component-engineer',
          skipPermissions: true,
        },
      });

      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args).toContain('--agent-id');
      expect(args).toContain('coder@my-team');
      expect(args).toContain('--team-name');
      expect(args).toContain('my-team');
      expect(args).toContain('--agent-type');
      expect(args).toContain('component-engineer');
      expect(args).toContain('--dangerously-skip-permissions');
    });

    it('sets agent teams env var when agentFlags present', () => {
      const pm = createProcessManager();
      pm.spawn({
        cwd: '/project',
        prompt: 'Hello',
        agentFlags: {
          agentId: 'coder@team',
          teamName: 'team',
        },
      });

      const envArg = mockSpawn.mock.calls[0][2] as { env: Record<string, string> };
      expect(envArg.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    });

    it('strips Claude session vars from env', () => {
      process.env['CLAUDE_CODE_SESSION'] = 'should-be-stripped';
      const pm = createProcessManager();
      pm.spawn({ cwd: '/project', prompt: 'Hello' });

      const envArg = mockSpawn.mock.calls[0][2] as { env: Record<string, string> };
      expect(envArg.env).not.toHaveProperty('CLAUDE_CODE_SESSION');

      delete process.env['CLAUDE_CODE_SESSION'];
    });

    it('marks process as dead on exit event', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: 'Hello' });

      expect(managed.alive).toBe(true);
      mockChild.emit('exit', 0, null);
      expect(managed.alive).toBe(false);
    });

    it('marks process as dead on error event', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: 'Hello' });

      mockChild.emit('error', new Error('spawn failed'));
      expect(managed.alive).toBe(false);
    });

    it('handles zero PID gracefully', () => {
      const zeroPidChild = createMockChildProcess(0);
      // Override pid to undefined to simulate spawn failure
      Object.defineProperty(zeroPidChild, 'pid', { value: undefined });
      mockSpawn.mockReturnValueOnce(zeroPidChild);

      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: 'Hello' });

      expect(managed.pid).toBe(0);
    });
  });

  // ── sendMessage() ─────────────────────────────────────────────

  describe('sendMessage()', () => {
    it('sends formatted NDJSON message', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const writeSpy = vi.spyOn(mockChild.stdin!, 'write');

      const result = pm.sendMessage(managed, 'Do something');
      expect(result).toBe(true);

      const written = writeSpy.mock.calls[0]?.[0] as unknown as string;
      const parsed = JSON.parse(written.trim());
      expect(parsed.type).toBe('user');
      expect(parsed.message.content).toBe('Do something');
    });

    it('updates lastActivityAt', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const before = managed.lastActivityAt;

      // Small delay to ensure time difference
      managed.lastActivityAt = new Date(Date.now() - 5000);
      pm.sendMessage(managed, 'test');

      expect(managed.lastActivityAt.getTime()).toBeGreaterThan(before.getTime() - 5001);
    });

    it('returns false for dead process', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      managed.alive = false;

      const result = pm.sendMessage(managed, 'test');
      expect(result).toBe(false);
    });

    it('returns false when stdin is destroyed', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      mockChild.stdin!.destroy();

      const result = pm.sendMessage(managed, 'test');
      expect(result).toBe(false);
    });
  });

  // ── kill() ────────────────────────────────────────────────────

  describe('kill()', () => {
    it('does nothing for dead process', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      managed.alive = false;

      const killSpy = vi.spyOn(mockChild, 'kill');
      pm.kill(managed);
      expect(killSpy).not.toHaveBeenCalled();
    });

    it('sends kill signal for alive process on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      pm.kill(managed);

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });
  });

  // ── isAlive() ─────────────────────────────────────────────────

  describe('isAlive()', () => {
    it('returns true for alive process', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      expect(pm.isAlive(managed)).toBe(true);
    });

    it('returns false for dead process', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      managed.alive = false;
      expect(pm.isAlive(managed)).toBe(false);
    });
  });

  // ── events() ──────────────────────────────────────────────────

  describe('events()', () => {
    it('registers and fires stdout handler', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);

      const handler = vi.fn();
      evts.onStdout(handler);

      const data = Buffer.from('hello');
      mockChild.stdout!.emit('data', data);

      expect(handler).toHaveBeenCalledWith(data);
    });

    it('updates lastActivityAt on stdout data', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);
      evts.onStdout(vi.fn());

      managed.lastActivityAt = new Date(Date.now() - 10000);
      const before = managed.lastActivityAt;

      mockChild.stdout!.emit('data', Buffer.from('data'));
      expect(managed.lastActivityAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('registers and fires stderr handler', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);

      const handler = vi.fn();
      evts.onStderr(handler);

      mockChild.stderr!.emit('data', Buffer.from('warning'));
      expect(handler).toHaveBeenCalledWith('warning');
    });

    it('registers and fires exit handler', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);

      const handler = vi.fn();
      evts.onExit(handler);

      mockChild.emit('exit', 0, null);
      expect(handler).toHaveBeenCalledWith(0, null);
    });

    it('registers and fires error handler', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);

      const handler = vi.fn();
      evts.onError(handler);

      const err = new Error('test error');
      mockChild.emit('error', err);
      expect(handler).toHaveBeenCalledWith(err);
    });

    it('unsubscribe removes stdout handler', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);

      const handler = vi.fn();
      const unsub = evts.onStdout(handler);

      mockChild.stdout!.emit('data', Buffer.from('first'));
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      mockChild.stdout!.emit('data', Buffer.from('second'));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe removes stderr handler', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);

      const handler = vi.fn();
      const unsub = evts.onStderr(handler);

      mockChild.stderr!.emit('data', Buffer.from('first'));
      unsub();
      mockChild.stderr!.emit('data', Buffer.from('second'));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe removes exit handler', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);

      const handler = vi.fn();
      const unsub = evts.onExit(handler);
      unsub();

      mockChild.emit('exit', 1, null);
      expect(handler).not.toHaveBeenCalled();
    });

    it('unsubscribe removes error handler', () => {
      const pm = createProcessManager();
      const managed = pm.spawn({ cwd: '/project', prompt: '' });
      const evts = pm.events(managed);

      const handler = vi.fn();
      const unsub = evts.onError(handler);
      unsub();

      mockChild.emit('error', new Error('test'));
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
