/**
 * Unit Tests for WorkspaceSessionManager
 *
 * Tests initProject, getSessions, spawnTeamLead, stopTeamLead, sendMessage, dispose.
 * Mocks AgentManagerService and BrowserWindow.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createWorkspaceSessionManager } from '@main/features/workspace/workspace-session-manager';

// ── Mock Factories ────────────────────────────────────────────

function makeAgentSession(id: string) {
  return {
    id,
    pid: 1234,
    status: 'active' as const,
    phase: 'executing' as const,
    spawnedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
  };
}

function makeMockAgentManager() {
  const eventHandlers: Array<(event: { type: string; sessionId: string }) => void> = [];

  return {
    spawnProjectOwner: vi.fn((config: { projectPath: string }) =>
      makeAgentSession(`primary-${config.projectPath}`),
    ),
    spawnTeamLead: vi.fn((config: { name: string }) =>
      makeAgentSession(`tl-${config.name}`),
    ),
    stopSession: vi.fn().mockReturnValue(true),
    sendMessage: vi.fn().mockReturnValue(true),
    onEvent: vi.fn((handler: (event: { type: string; sessionId: string }) => void) => {
      eventHandlers.push(handler);
      return () => {
        const idx = eventHandlers.indexOf(handler);
        if (idx !== -1) eventHandlers.splice(idx, 1);
      };
    }),
    listSessions: vi.fn().mockReturnValue([]),
    getSession: vi.fn(),
    getSessionProjectPath: vi.fn(),
    getMessages: vi.fn().mockReturnValue([]),
    dispose: vi.fn(),
    // Expose for tests to trigger events
    _triggerEvent(event: { type: string; sessionId: string }) {
      for (const handler of eventHandlers) {
        handler(event);
      }
    },
  };
}

function makeMockProvisioner() {
  return {
    provision: vi.fn(({ slug }: { slug: string }) => ({
      worktreePath: `/tmp/worktrees/${slug}`,
      branch: `worktree/${slug}`,
      claudeMdPath: `/tmp/worktrees/${slug}/CLAUDE.md`,
    })),
    teardown: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockReturnValue(false),
  };
}

function makeMockWindow() {
  return {
    webContents: {
      send: vi.fn(),
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('WorkspaceSessionManager', () => {
  let agentManager: ReturnType<typeof makeMockAgentManager>;
  let mockProvisioner: ReturnType<typeof makeMockProvisioner>;
  let mockWindow: ReturnType<typeof makeMockWindow>;
  let mockBusSessionManager: {
    spawn: ReturnType<typeof vi.fn>;
    kill: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    onEvent: ReturnType<typeof vi.fn>;
    recoverInterrupted: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };

  let spawnCallCount: number;

  beforeEach(() => {
    vi.clearAllMocks();
    agentManager = makeMockAgentManager();
    mockProvisioner = makeMockProvisioner();
    mockWindow = makeMockWindow();
    spawnCallCount = 0;
    mockBusSessionManager = {
      spawn: vi.fn().mockImplementation(() => {
        spawnCallCount++;
        return Promise.resolve({ id: `bus-session-${String(spawnCallCount)}`, name: 'test', type: 'project-owner', status: 'active', startedAt: new Date().toISOString(), phase: null, projectId: null, taskSlug: null, model: null, pid: null, worktreePath: null, spawnConfig: null, tokenUsage: null, toolUsage: null, parentId: null, teamName: null, wave: null, taskIndex: null, endedAt: null, exitCode: null, error: null });
      }),
      kill: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockReturnValue([]),
      get: vi.fn(),
      onEvent: vi.fn().mockReturnValue(() => {}),
      recoverInterrupted: vi.fn(),
      dispose: vi.fn(),
    };
  });

  function createManager() {
    return createWorkspaceSessionManager(
      agentManager as never,
      mockProvisioner as never,
      () => mockWindow as never,
      mockBusSessionManager as never,
    );
  }

  describe('initProject()', () => {
    it('spawns primary and team lead sessions with worktree provisioning', async () => {
      const manager = createManager();
      const result = await manager.initProject('proj-1', '/projects/my-app');

      // Primary + team-lead both go through busSessionManager.spawn
      expect(mockBusSessionManager.spawn).toHaveBeenCalledTimes(2);
      expect(mockProvisioner.provision).toHaveBeenCalledTimes(1);
      expect(mockProvisioner.provision).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: 'team-lead',
          agentRole: 'team-leader',
        }),
      );
      expect(result.primarySessionId).toBeTruthy();
      expect(result.teamLeadSessionId).toBeTruthy();
    });

    it('is idempotent — second call returns existing sessions', async () => {
      const manager = createManager();
      const first = await manager.initProject('proj-1', '/projects/my-app');
      const second = await manager.initProject('proj-1', '/projects/my-app');

      expect(first.primarySessionId).toBe(second.primarySessionId);
      // busSessionManager.spawn called only twice (primary + team-lead) since sessions are already live
      expect(mockBusSessionManager.spawn).toHaveBeenCalledTimes(2);
    });

    it('sends sessionReady events via BrowserWindow', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'event:workspace.sessionReady',
        expect.objectContaining({ projectId: 'proj-1' }),
      );
    });
  });

  describe('getSessions()', () => {
    it('returns sessions for a specific project', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');

      const sessions = manager.getSessions('proj-1');

      expect(sessions.length).toBeGreaterThanOrEqual(2); // primary + team-lead
    });

    it('returns empty array for unknown project', () => {
      const manager = createManager();
      const sessions = manager.getSessions('nonexistent');

      expect(sessions).toEqual([]);
    });
  });

  describe('spawnTeamLead()', () => {
    it('spawns a mortal team lead with incremented index', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');

      const session = await manager.spawnTeamLead('proj-1');

      expect(session.key.type).toBe('team-lead');
      expect(session.key.index).toBeGreaterThanOrEqual(1);
      expect(session.status).toBe('live');
    });

    it('includes planPath in prompt when provided', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');

      await manager.spawnTeamLead('proj-1', '/plans/feature.md');

      // The last busSessionManager.spawn call (mortal team-lead) should have the plan path in prompt
      const lastCall = mockBusSessionManager.spawn.mock.calls.at(-1)?.[0] as
        | { prompt: string }
        | undefined;
      expect(lastCall?.prompt).toContain('/plans/feature.md');
    });

    it('throws when busSessionManager.spawn rejects', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');

      mockBusSessionManager.spawn.mockRejectedValueOnce(new Error('spawn_failed'));

      await expect(manager.spawnTeamLead('proj-1')).rejects.toThrow('Failed to spawn');
    });
  });

  describe('stopTeamLead()', () => {
    it('stops a mortal team lead (index >= 1)', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');
      await manager.spawnTeamLead('proj-1');

      const result = await manager.stopTeamLead('proj-1', 1);

      expect(result.success).toBe(true);
      expect(agentManager.stopSession).toHaveBeenCalled();
    });

    it('refuses to stop immortal team lead (index 0)', async () => {
      const manager = createManager();
      const result = await manager.stopTeamLead('proj-1', 0);

      expect(result.success).toBe(false);
    });

    it('returns false for nonexistent session', async () => {
      const manager = createManager();
      const result = await manager.stopTeamLead('proj-1', 99);

      expect(result.success).toBe(false);
    });
  });

  describe('sendMessage()', () => {
    it('delegates to agentManager.sendMessage', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');

      const sessions = manager.getSessions('proj-1');
      const sessionId = sessions[0]!.agentSessionId;

      const result = await manager.sendMessage(sessionId, 'Hello agent');

      expect(result.success).toBe(true);
      expect(agentManager.sendMessage).toHaveBeenCalledWith(sessionId, 'Hello agent');
    });
  });

  describe('dispose()', () => {
    it('clears all sessions and tears down worktrees', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');

      manager.dispose();

      const sessions = manager.getSessions('proj-1');
      expect(sessions).toEqual([]);
      expect(mockProvisioner.teardown).toHaveBeenCalled();
    });
  });
});
