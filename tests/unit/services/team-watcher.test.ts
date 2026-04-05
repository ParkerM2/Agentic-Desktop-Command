/**
 * Unit Tests for TeamWatcher Service
 *
 * Tests team membership tracking: startWatching, stopWatching, getTeamMembers,
 * join/leave handlers, and dispose.
 * Uses memfs for file system mocking.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// Mock logger
vi.mock('@main/lib/logger', () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  serviceLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createScopedLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// ── Path Mocking ────────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return { ...original, join: original.posix.join };
});

// Mock os.homedir
vi.mock('node:os', () => ({
  homedir: () => '/mock/home',
}));

// ── File System Mocking ─────────────────────────────────────────

// We need to capture the fs.watch callback so we can simulate changes
const mockWatchers = new Map<string, { callback: (...args: unknown[]) => void; close: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> }>();

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;

  return {
    default: fs,
    ...fs,
    // Override watch to capture callbacks
    watch: vi.fn((dir: string, callback: (...args: unknown[]) => void) => {
      const watcher = {
        callback,
        close: vi.fn(),
        on: vi.fn(),
      };
      mockWatchers.set(dir, watcher);
      return watcher;
    }),
  };
});

const { createTeamWatcherService } = await import(
  '@main/services/team-watcher/team-watcher-service'
);

// ── Helpers ─────────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const posixPath = filePath.replace(/\\/g, '/');
    const dir = posixPath.substring(0, posixPath.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(posixPath, content, { encoding: 'utf-8' });
  }
}

const TEAMS_DIR = '/mock/home/.claude/teams';

function teamConfigPath(teamName: string): string {
  return posix.join(TEAMS_DIR, teamName, 'config.json');
}

function makeConfig(members: Array<Record<string, unknown>>): string {
  return JSON.stringify({ members });
}

// ── Tests ───────────────────────────────────────────────────────

describe('TeamWatcherService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockWatchers.clear();
    resetFs();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFs();
  });

  describe('startWatching()', () => {
    it('reads initial members from config.json', () => {
      resetFs({
        [teamConfigPath('my-team')]: makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work', status: 'running' },
        ]),
      });

      const service = createTeamWatcherService();
      service.startWatching('my-team');

      const members = service.getTeamMembers('my-team');
      expect(members).toHaveLength(1);
      expect(members[0]?.agentId).toBe('agent-1');
      expect(members[0]?.name).toBe('Agent 1');

      service.dispose();
    });

    it('returns empty members when config does not exist', () => {
      const service = createTeamWatcherService();
      service.startWatching('no-team');

      const members = service.getTeamMembers('no-team');
      expect(members).toEqual([]);

      service.dispose();
    });

    it('skips members without agentId', () => {
      resetFs({
        [teamConfigPath('my-team')]: makeConfig([
          { agentId: '', name: 'Empty ID' },
          { name: 'No ID' },
          { agentId: 'valid', name: 'Valid Agent', sessionId: '', cwd: '' },
        ]),
      });

      const service = createTeamWatcherService();
      service.startWatching('my-team');

      const members = service.getTeamMembers('my-team');
      expect(members).toHaveLength(1);
      expect(members[0]?.agentId).toBe('valid');

      service.dispose();
    });

    it('does not start duplicate watcher for same team', () => {
      const service = createTeamWatcherService();
      service.startWatching('my-team');
      service.startWatching('my-team'); // Should log warning, not create duplicate

      service.dispose();
    });

    it('defaults status to running for invalid status values', () => {
      resetFs({
        [teamConfigPath('my-team')]: makeConfig([
          { agentId: 'a1', name: 'Agent', status: 'invalid_status' },
        ]),
      });

      const service = createTeamWatcherService();
      service.startWatching('my-team');

      const members = service.getTeamMembers('my-team');
      expect(members[0]?.status).toBe('running');

      service.dispose();
    });
  });

  describe('stopWatching()', () => {
    it('removes the team and closes the watcher', () => {
      const service = createTeamWatcherService();
      service.startWatching('my-team');

      service.stopWatching('my-team');

      const members = service.getTeamMembers('my-team');
      expect(members).toEqual([]);
    });

    it('does nothing for non-watched team', () => {
      const service = createTeamWatcherService();
      // Should not throw
      service.stopWatching('nonexistent');
    });
  });

  describe('getTeamMembers()', () => {
    it('returns empty array for non-watched team', () => {
      const service = createTeamWatcherService();
      expect(service.getTeamMembers('unknown')).toEqual([]);
    });
  });

  describe('onTeammateJoined() and onTeammateLeft()', () => {
    it('notifies when new member joins on config change', () => {
      // Start with one member
      resetFs({
        [teamConfigPath('my-team')]: makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
        ]),
      });

      const service = createTeamWatcherService();
      const joinHandler = vi.fn();
      service.onTeammateJoined(joinHandler);
      service.startWatching('my-team');

      // Now add a second member
      const vol = getMockVol();
      vol.writeFileSync(
        teamConfigPath('my-team'),
        makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
          { agentId: 'agent-2', name: 'Agent 2', sessionId: 's2', cwd: '/work2' },
        ]),
      );

      // Simulate fs.watch event
      const teamDir = posix.join(TEAMS_DIR, 'my-team');
      const watcher = mockWatchers.get(teamDir);
      expect(watcher).toBeDefined();
      watcher?.callback('change', 'config.json');

      // Advance past debounce
      vi.advanceTimersByTime(350);

      expect(joinHandler).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: 'agent-2', name: 'Agent 2' }),
      );

      service.dispose();
    });

    it('notifies when member leaves on config change', () => {
      resetFs({
        [teamConfigPath('my-team')]: makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
          { agentId: 'agent-2', name: 'Agent 2', sessionId: 's2', cwd: '/work2' },
        ]),
      });

      const service = createTeamWatcherService();
      const leftHandler = vi.fn();
      service.onTeammateLeft(leftHandler);
      service.startWatching('my-team');

      // Remove agent-2
      const vol = getMockVol();
      vol.writeFileSync(
        teamConfigPath('my-team'),
        makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
        ]),
      );

      const teamDir = posix.join(TEAMS_DIR, 'my-team');
      const watcher = mockWatchers.get(teamDir);
      watcher?.callback('change', 'config.json');
      vi.advanceTimersByTime(350);

      expect(leftHandler).toHaveBeenCalledWith('agent-2');

      service.dispose();
    });

    it('ignores fs events for non-config.json files', () => {
      resetFs({
        [teamConfigPath('my-team')]: makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
        ]),
      });

      const service = createTeamWatcherService();
      const joinHandler = vi.fn();
      service.onTeammateJoined(joinHandler);
      service.startWatching('my-team');

      const teamDir = posix.join(TEAMS_DIR, 'my-team');
      const watcher = mockWatchers.get(teamDir);
      watcher?.callback('change', 'other-file.json');
      vi.advanceTimersByTime(350);

      // No join events beyond initial
      expect(joinHandler).not.toHaveBeenCalled();

      service.dispose();
    });

    it('debounces rapid config changes', () => {
      resetFs({
        [teamConfigPath('my-team')]: makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
        ]),
      });

      const service = createTeamWatcherService();
      const joinHandler = vi.fn();
      service.onTeammateJoined(joinHandler);
      service.startWatching('my-team');

      // Update config to add member
      const vol = getMockVol();
      vol.writeFileSync(
        teamConfigPath('my-team'),
        makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
          { agentId: 'agent-2', name: 'Agent 2', sessionId: 's2', cwd: '/work2' },
        ]),
      );

      const teamDir = posix.join(TEAMS_DIR, 'my-team');
      const watcher = mockWatchers.get(teamDir);

      // Fire multiple events rapidly
      watcher?.callback('change', 'config.json');
      vi.advanceTimersByTime(100);
      watcher?.callback('change', 'config.json');
      vi.advanceTimersByTime(100);
      watcher?.callback('change', 'config.json');

      // Not yet debounced
      expect(joinHandler).not.toHaveBeenCalled();

      // Advance past debounce
      vi.advanceTimersByTime(350);

      // Should only fire once despite 3 events
      expect(joinHandler).toHaveBeenCalledTimes(1);

      service.dispose();
    });

    it('returns unsubscribe function', () => {
      const service = createTeamWatcherService();
      const handler = vi.fn();
      const unsub = service.onTeammateJoined(handler);

      unsub();

      // Start watching after unsubscribe — handler should not be called
      resetFs({
        [teamConfigPath('my-team')]: makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
        ]),
      });
      service.startWatching('my-team');

      // Simulate join
      const vol = getMockVol();
      vol.writeFileSync(
        teamConfigPath('my-team'),
        makeConfig([
          { agentId: 'agent-1', name: 'Agent 1', sessionId: 's1', cwd: '/work' },
          { agentId: 'agent-2', name: 'Agent 2', sessionId: 's2', cwd: '/work2' },
        ]),
      );

      const teamDir = posix.join(TEAMS_DIR, 'my-team');
      const watcher = mockWatchers.get(teamDir);
      watcher?.callback('change', 'config.json');
      vi.advanceTimersByTime(350);

      expect(handler).not.toHaveBeenCalled();

      service.dispose();
    });
  });

  describe('dispose()', () => {
    it('closes all watchers and clears state', () => {
      resetFs({
        [teamConfigPath('team-a')]: makeConfig([
          { agentId: 'a1', name: 'A1', sessionId: 's1', cwd: '' },
        ]),
        [teamConfigPath('team-b')]: makeConfig([
          { agentId: 'b1', name: 'B1', sessionId: 's2', cwd: '' },
        ]),
      });

      const service = createTeamWatcherService();
      service.startWatching('team-a');
      service.startWatching('team-b');

      service.dispose();

      expect(service.getTeamMembers('team-a')).toEqual([]);
      expect(service.getTeamMembers('team-b')).toEqual([]);
    });

    it('clears event handlers', () => {
      const service = createTeamWatcherService();
      service.onTeammateJoined(vi.fn());
      service.onTeammateLeft(vi.fn());
      service.dispose();

      // After dispose, starting a new watch should not call old handlers
      // (they were cleared)
    });
  });
});
