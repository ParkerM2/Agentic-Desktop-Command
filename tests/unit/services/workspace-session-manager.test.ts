/**
 * Unit Tests for WorkspaceSessionManager
 *
 * Tests initProject, getSessions, spawnTeamLead, stopTeamLead, sendMessage, dispose.
 * Mocks AgentManagerService and BrowserWindow.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createWorkspaceSessionManager } from '@main/services/workspace/workspace-session-manager';

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
    teardown: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();
    agentManager = makeMockAgentManager();
    mockProvisioner = makeMockProvisioner();
    mockWindow = makeMockWindow();
  });

  function createManager() {
    return createWorkspaceSessionManager(
      agentManager as never,
      mockProvisioner as never,
      () => mockWindow as never,
    );
  }

  describe('initProject()', () => {
    it('spawns primary and team lead sessions with worktree provisioning', async () => {
      const manager = createManager();
      const result = await manager.initProject('proj-1', '/projects/my-app');

      expect(agentManager.spawnProjectOwner).toHaveBeenCalledTimes(1);
      expect(agentManager.spawnTeamLead).toHaveBeenCalledTimes(1);
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
      // spawnProjectOwner called only once since session is already live
      expect(agentManager.spawnProjectOwner).toHaveBeenCalledTimes(1);
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

      // The second spawnTeamLead call (mortal) should have the plan path in prompt
      const lastCall = agentManager.spawnTeamLead.mock.calls.at(-1)?.[0] as
        | { prompt: string }
        | undefined;
      expect(lastCall?.prompt).toContain('/plans/feature.md');
    });

    it('throws when agentManager returns error result', async () => {
      const manager = createManager();
      await manager.initProject('proj-1', '/projects/my-app');

      agentManager.spawnTeamLead.mockReturnValueOnce({ error: 'spawn_failed' } as unknown as ReturnType<typeof agentManager.spawnTeamLead>);

      expect(() => manager.spawnTeamLead('proj-1')).toThrow('Failed to spawn');
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
