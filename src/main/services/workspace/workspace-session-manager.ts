/**
 * WorkspaceSessionManager — always-on session lifecycle per project.
 *
 * Rules:
 * - primary + team-lead[0] are IMMORTAL: auto-restart on crash, never user-terminated.
 * - team-lead[1..N] are MORTAL: user can stop them, no auto-restart.
 * - initProject() is idempotent — safe to call every time a project tab opens.
 * - Sessions are keyed by projectId — switching tabs never touches sessions.
 */

import type { BrowserWindow } from 'electron';

import type { SessionKey, WorkspaceSession } from '@shared/ipc/workspace';

import type { AgentManagerService } from '../agent-manager';

const PRIMARY_MODEL = 'claude-sonnet-4-6';
const TEAM_LEAD_MODEL = 'claude-sonnet-4-6';
const RESTART_DELAY_MS = 2000;

type SessionKeyString = string;

function keyToString(key: SessionKey): SessionKeyString {
  return `${key.projectId}:${key.type}:${key.index}`;
}

function isImmortal(key: SessionKey): boolean {
  return key.type === 'primary' || key.index === 0;
}

export interface WorkspaceSessionManager {
  initProject: (
    projectId: string,
    projectPath: string,
  ) => Promise<{ primarySessionId: string; teamLeadSessionId: string }>;
  initAllProjects: (projects: Array<{ id: string; path: string }>) => Promise<void>;
  getSessions: (projectId: string) => WorkspaceSession[];
  spawnTeamLead: (projectId: string, planPath?: string) => Promise<WorkspaceSession>;
  stopTeamLead: (projectId: string, index: number) => Promise<{ success: boolean }>;
  sendMessage: (sessionId: string, message: string) => Promise<{ success: boolean }>;
  dispose: () => void;
}

export function createWorkspaceSessionManager(
  agentManager: AgentManagerService,
  getWindow: () => BrowserWindow | null,
): WorkspaceSessionManager {
  const sessions = new Map<SessionKeyString, WorkspaceSession>();

  function sendEvent(channel: string, payload: unknown): void {
    getWindow()?.webContents.send(channel, payload);
  }

  function updateSession(key: SessionKey, patch: Partial<WorkspaceSession>): void {
    const keyStr = keyToString(key);
    const existing = sessions.get(keyStr);
    if (existing) sessions.set(keyStr, { ...existing, ...patch });
  }

  function spawnPrimary(projectId: string, projectPath: string): string {
    const key: SessionKey = { projectId, type: 'primary', index: 0 };
    const keyStr = keyToString(key);

    const existing = sessions.get(keyStr);
    if (existing && (existing.status === 'live' || existing.status === 'starting')) {
      return existing.agentSessionId;
    }

    const session: WorkspaceSession = {
      key,
      agentSessionId: '',
      projectPath,
      model: PRIMARY_MODEL,
      status: 'starting',
      startedAt: Date.now(),
      crashCount: existing?.crashCount ?? 0,
    };
    sessions.set(keyStr, session);

    const result = agentManager.spawnProjectOwner({
      projectPath,
      prompt: 'You are the primary Claude session for this project. Await instructions.',
      model: PRIMARY_MODEL,
      name: `workspace-primary-${projectId}`,
    });

    updateSession(key, { agentSessionId: result.id, status: 'live' });
    sendEvent('event:workspace.sessionReady', {
      projectId,
      sessionKey: key,
      sessionId: result.id,
    });
    return result.id;
  }

  function spawnImmortalTeamLead(projectId: string, projectPath: string): string {
    const key: SessionKey = { projectId, type: 'team-lead', index: 0 };
    const keyStr = keyToString(key);

    const existing = sessions.get(keyStr);
    if (existing && (existing.status === 'live' || existing.status === 'starting')) {
      return existing.agentSessionId;
    }

    const session: WorkspaceSession = {
      key,
      agentSessionId: '',
      projectPath,
      model: TEAM_LEAD_MODEL,
      status: 'starting',
      startedAt: Date.now(),
      crashCount: existing?.crashCount ?? 0,
    };
    sessions.set(keyStr, session);

    const result = agentManager.spawnTeamLead({
      projectPath,
      teamName: `workspace-tl-${projectId}`,
      prompt: 'You are Team Lead 1 for this project. Await a plan file or instructions.',
      model: TEAM_LEAD_MODEL,
      name: `workspace-tl-${projectId}`,
    });

    if ('error' in result) {
      sessions.set(keyStr, { ...session, status: 'crashed' });
      throw new Error(`Failed to spawn team lead: ${result.error}`);
    }

    updateSession(key, { agentSessionId: result.id, status: 'live' });
    sendEvent('event:workspace.sessionReady', {
      projectId,
      sessionKey: key,
      sessionId: result.id,
    });
    return result.id;
  }

  // Listen for agent session end events to handle immortal restart
  agentManager.onEvent((event) => {
    if (event.type !== 'session.ended') return;

    for (const [keyStr, session] of sessions.entries()) {
      if (session.agentSessionId !== event.sessionId) continue;

      const { key } = session;
      if (!isImmortal(key)) {
        // Mortal: just mark as crashed
        sessions.set(keyStr, { ...session, status: 'crashed' });
        return;
      }

      // Immortal: increment crash count, emit event, restart after delay
      const crashCount = session.crashCount + 1;
      sessions.set(keyStr, { ...session, status: 'restarting', crashCount });
      sendEvent('event:workspace.sessionCrashed', {
        projectId: key.projectId,
        sessionKey: key,
        crashCount,
      });

      setTimeout(() => {
        const current = sessions.get(keyStr);
        if (!current) return;

        // Clear agentSessionId so spawn functions will re-spawn
        sessions.set(keyStr, { ...current, agentSessionId: '', status: 'starting' });

        const newSessionId =
          key.type === 'primary'
            ? spawnPrimary(key.projectId, session.projectPath)
            : spawnImmortalTeamLead(key.projectId, session.projectPath);
        sendEvent('event:workspace.sessionRestarted', {
          projectId: key.projectId,
          sessionKey: key,
          sessionId: newSessionId,
        });
      }, RESTART_DELAY_MS);

      return;
    }
  });

  return {
    initProject(projectId, projectPath) {
      const primarySessionId = spawnPrimary(projectId, projectPath);
      const teamLeadSessionId = spawnImmortalTeamLead(projectId, projectPath);
      return Promise.resolve({ primarySessionId, teamLeadSessionId });
    },

    async initAllProjects(projects) {
      const SPAWN_DELAY_MS = 100;
      for (const project of projects) {
        await this.initProject(project.id, project.path);
        if (project !== projects.at(-1)) {
          await new Promise<void>((resolve) => {
          setTimeout(resolve, SPAWN_DELAY_MS);
        });
        }
      }
    },

    getSessions(projectId) {
      return [...sessions.values()].filter((s) => s.key.projectId === projectId);
    },

    spawnTeamLead(projectId, planPath) {
      // Find next available mortal index (immortal is index 0, mortals start at 1)
      const existing = [...sessions.values()].filter(
        (s) => s.key.projectId === projectId && s.key.type === 'team-lead',
      );
      const nextIndex = existing.length;

      const projectPath = existing[0]?.projectPath ?? '';
      const key: SessionKey = { projectId, type: 'team-lead', index: nextIndex };
      const keyStr = keyToString(key);

      const prompt = planPath
        ? `You are Team Lead ${nextIndex + 1}. Your plan file is at: ${planPath}. Read it and begin.`
        : `You are Team Lead ${nextIndex + 1} for this project. Await a plan file or instructions.`;

      const session: WorkspaceSession = {
        key,
        agentSessionId: '',
        projectPath,
        model: TEAM_LEAD_MODEL,
        status: 'starting',
        startedAt: Date.now(),
        crashCount: 0,
      };
      sessions.set(keyStr, session);

      const result = agentManager.spawnTeamLead({
        projectPath,
        teamName: `workspace-tl-${projectId}-${nextIndex}`,
        prompt,
        model: TEAM_LEAD_MODEL,
        name: `workspace-tl-${projectId}-${nextIndex}`,
      });

      if ('error' in result) {
        sessions.delete(keyStr);
        throw new Error(`Failed to spawn team lead: ${result.error}`);
      }

      const ready: WorkspaceSession = { ...session, agentSessionId: result.id, status: 'live' };
      sessions.set(keyStr, ready);
      sendEvent('event:workspace.sessionReady', {
        projectId,
        sessionKey: key,
        sessionId: result.id,
      });
      return Promise.resolve(ready);
    },

    stopTeamLead(projectId, index) {
      if (index < 1) return Promise.resolve({ success: false }); // Cannot stop immortal
      const key: SessionKey = { projectId, type: 'team-lead', index };
      const keyStr = keyToString(key);
      const session = sessions.get(keyStr);
      if (!session) return Promise.resolve({ success: false });

      const stopped = agentManager.stopSession(session.agentSessionId);
      if (stopped) {
        sessions.delete(keyStr);
      }
      return Promise.resolve({ success: stopped });
    },

    sendMessage(sessionId, message) {
      const success = agentManager.sendMessage(sessionId, message);
      return Promise.resolve({ success });
    },

    dispose() {
      for (const session of sessions.values()) {
        if (session.agentSessionId) {
          agentManager.stopSession(session.agentSessionId);
        }
      }
      sessions.clear();
    },
  };
}
