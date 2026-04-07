/**
 * WorkspaceSessionManager — always-on session lifecycle per project.
 *
 * Rules:
 * - primary + team-lead[0] are IMMORTAL: auto-restart on crash, never user-terminated.
 * - team-lead[1..N] are MORTAL: user can stop them, no auto-restart.
 * - initProject() is idempotent — safe to call every time a project tab opens.
 * - Sessions are keyed by projectId — switching tabs never touches sessions.
 *
 * Team-lead isolation:
 * - Every team-lead spawns in its own git worktree via WorktreeProvisioner.
 * - Each worktree gets a custom CLAUDE.md (from the team-leader agent definition)
 *   and enforcement hooks in .claude/settings.local.json.
 * - This prevents hooks from bleeding into other sessions (primary, teammates, user).
 *
 * Plan handoff:
 * - handOffPlan() routes a plan file to an idle team-lead or spawns a new one.
 * - executeTask() sends ad-hoc task descriptions the same way.
 * - provisionTeammate() / teardownTeammate() give team-leads isolated worktrees
 *   for the teammate agents they spawn.
 */

import type { BrowserWindow } from 'electron';

import type { SessionKey, WorkspaceSession } from '@shared/ipc/workspace';

import { agentLogger } from '@main/lib/logger';

import type { AgentManagerService } from '../agent-manager';
import type { WorktreeProvisioner } from '../worktree-provisioner';

const PRIMARY_MODEL = 'claude-sonnet-4-6';
const TEAM_LEAD_MODEL = 'claude-sonnet-4-6';
const RESTART_DELAY_MS = 2000;
const SESSION_TYPE_TEAM_LEAD = 'team-lead' as const;
const EVENT_SESSION_READY = 'event:workspace.sessionReady';

type SessionKeyString = string;

/** Map session keys to their provisioned worktree slugs for cleanup */
const worktreeSlugs = new Map<SessionKeyString, string>();

/** Map teammate slugs to their project paths for cleanup */
const teammateSlugs = new Map<string, string>();

function keyToString(key: SessionKey): SessionKeyString {
  return `${key.projectId}:${key.type}:${String(key.index)}`;
}

function isImmortal(key: SessionKey): boolean {
  return key.type === 'primary' || key.index === 0;
}

function teamLeadSlug(projectId: string, index: number): string {
  return `team-lead-${projectId}-${String(index)}`;
}

// ─── Handoff Result Type ────────────────────────────────────

export interface HandoffResult {
  sessionId: string;
  teamLeadIndex: number;
  action: 'spawned' | 'reused';
}

// ─── Service Interface ──────────────────────────────────────

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
  /** Hand off a plan file to an idle team-lead or spawn a new one */
  handOffPlan: (
    projectId: string,
    planPath: string,
    instructions?: string,
  ) => HandoffResult;
  /** Send an ad-hoc task to a team-lead */
  executeTask: (
    projectId: string,
    taskDescription: string,
    planPath?: string,
  ) => HandoffResult;
  /** Provision an isolated worktree for a teammate agent */
  provisionTeammate: (
    projectId: string,
    agentRole: string,
    slug: string,
    teamName: string,
    taskInstructions?: string,
  ) => { worktreePath: string; branch: string };
  /** Tear down a teammate's worktree */
  teardownTeammate: (projectId: string, slug: string) => { success: boolean };
  dispose: () => void;
}

// ─── Factory ────────────────────────────────────────────────

export function createWorkspaceSessionManager(
  agentManager: AgentManagerService,
  provisioner: WorktreeProvisioner,
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

  /**
   * Find the project path for a given projectId from existing sessions.
   */
  function getProjectPath(projectId: string): string {
    for (const session of sessions.values()) {
      if (session.key.projectId === projectId && session.projectPath.length > 0) {
        return session.projectPath;
      }
    }
    return '';
  }

  /**
   * Find an idle team-lead for the project. "Idle" means status is 'live'
   * and the agent session status is 'idle' (waiting for input).
   * Prefers the immortal team-lead (index 0) if idle.
   */
  function findIdleTeamLead(projectId: string): WorkspaceSession | undefined {
    const teamLeads = [...sessions.values()]
      .filter(
        (s) =>
          s.key.projectId === projectId &&
          s.key.type === SESSION_TYPE_TEAM_LEAD &&
          s.status === 'live',
      )
      .sort((a, b) => a.key.index - b.key.index);

    for (const tl of teamLeads) {
      const agentSession = agentManager.getSession(tl.agentSessionId);
      if (agentSession && (agentSession.status === 'idle' || agentSession.status === 'running')) {
        return tl;
      }
    }

    return undefined;
  }

  /**
   * Provision a worktree for a team-lead and spawn the agent into it.
   * Returns the agent session ID.
   */
  function provisionAndSpawnTeamLead(
    projectId: string,
    projectPath: string,
    index: number,
    prompt: string,
    planPath?: string,
  ): string {
    const slug = teamLeadSlug(projectId, index);
    const key: SessionKey = { projectId, type: SESSION_TYPE_TEAM_LEAD, index };
    const keyStr = keyToString(key);

    // Provision isolated worktree
    const { worktreePath } = provisioner.provision({
      projectPath,
      agentType: 'team-lead',
      agentRole: 'team-leader',
      slug,
      teamName: `workspace-tl-${projectId}-${String(index)}`,
      planPath,
    });

    // Track slug for cleanup
    worktreeSlugs.set(keyStr, slug);

    agentLogger.info(
      `[WorkspaceSessionManager] Team-lead ${String(index)} provisioned at ${worktreePath}`,
    );

    // Spawn the team-lead in the provisioned worktree
    const result = agentManager.spawnTeamLead({
      projectPath: worktreePath,
      teamName: `workspace-tl-${projectId}-${String(index)}`,
      prompt,
      model: TEAM_LEAD_MODEL,
      name: `workspace-tl-${projectId}-${String(index)}`,
    });

    if ('error' in result) {
      // Clean up the worktree on spawn failure
      provisioner.teardown(projectPath, slug);
      worktreeSlugs.delete(keyStr);
      throw new Error(`Failed to spawn team lead: ${result.error}`);
    }

    return result.id;
  }

  /**
   * Clean up a team-lead's worktree when its session ends.
   */
  function cleanupWorktree(key: SessionKey, projectPath: string): void {
    const keyStr = keyToString(key);
    const slug = worktreeSlugs.get(keyStr);
    if (slug) {
      provisioner.teardown(projectPath, slug);
      worktreeSlugs.delete(keyStr);
    }
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
      prompt: 'You are the primary Claude session for this project. You can hand off plans to team-lead agents using the workspace.handOffPlan IPC channel, or send ad-hoc tasks via workspace.executeTask. When the user asks you to delegate work, send a plan, or have a team-lead execute something, use these channels. Await instructions.',
      model: PRIMARY_MODEL,
      name: `workspace-primary-${projectId}`,
    });

    updateSession(key, { agentSessionId: result.id, status: 'live' });
    sendEvent(EVENT_SESSION_READY, {
      projectId,
      sessionKey: key,
      sessionId: result.id,
    });
    return result.id;
  }

  function spawnImmortalTeamLead(projectId: string, projectPath: string): string {
    const key: SessionKey = { projectId, type: SESSION_TYPE_TEAM_LEAD, index: 0 };
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

    const sessionId = provisionAndSpawnTeamLead(
      projectId,
      projectPath,
      0,
      'You are Team Lead 1 for this project. Await a plan file or instructions.',
    );

    updateSession(key, { agentSessionId: sessionId, status: 'live' });
    sendEvent(EVENT_SESSION_READY, {
      projectId,
      sessionKey: key,
      sessionId,
    });
    return sessionId;
  }

  // Listen for agent session end events to handle immortal restart + worktree cleanup
  agentManager.onEvent((event) => {
    if (event.type !== 'session.ended') return;

    for (const [keyStr, session] of sessions.entries()) {
      if (session.agentSessionId !== event.sessionId) continue;

      const { key } = session;

      if (!isImmortal(key)) {
        // Mortal: mark as crashed and clean up worktree
        sessions.set(keyStr, { ...session, status: 'crashed' });
        if (key.type === SESSION_TYPE_TEAM_LEAD) {
          cleanupWorktree(key, session.projectPath);
        }
        return;
      }

      // Immortal: increment crash count, clean up old worktree, restart after delay
      const crashCount = session.crashCount + 1;
      sessions.set(keyStr, { ...session, status: 'restarting', crashCount });

      // Clean up the crashed worktree before restarting
      if (key.type === SESSION_TYPE_TEAM_LEAD) {
        cleanupWorktree(key, session.projectPath);
      }

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

  // ── Public API ────────────────────────────────────────────

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
        (s) => s.key.projectId === projectId && s.key.type === SESSION_TYPE_TEAM_LEAD,
      );
      const nextIndex = existing.length;

      const projectPath = existing[0]?.projectPath ?? '';
      const key: SessionKey = { projectId, type: SESSION_TYPE_TEAM_LEAD, index: nextIndex };
      const keyStr = keyToString(key);

      const prompt = planPath
        ? `You are Team Lead ${String(nextIndex + 1)}. Your plan file is at: ${planPath}. Read it and begin execution.`
        : `You are Team Lead ${String(nextIndex + 1)} for this project. Await a plan file or instructions.`;

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

      const sessionId = provisionAndSpawnTeamLead(
        projectId,
        projectPath,
        nextIndex,
        prompt,
        planPath,
      );

      const ready: WorkspaceSession = { ...session, agentSessionId: sessionId, status: 'live' };
      sessions.set(keyStr, ready);
      sendEvent(EVENT_SESSION_READY, {
        projectId,
        sessionKey: key,
        sessionId,
      });
      return Promise.resolve(ready);
    },

    stopTeamLead(projectId, index) {
      if (index < 1) return Promise.resolve({ success: false }); // Cannot stop immortal
      const key: SessionKey = { projectId, type: SESSION_TYPE_TEAM_LEAD, index };
      const keyStr = keyToString(key);
      const session = sessions.get(keyStr);
      if (!session) return Promise.resolve({ success: false });

      const stopped = agentManager.stopSession(session.agentSessionId);
      if (stopped) {
        cleanupWorktree(key, session.projectPath);
        sessions.delete(keyStr);
      }
      return Promise.resolve({ success: stopped });
    },

    sendMessage(sessionId, message) {
      const success = agentManager.sendMessage(sessionId, message);
      return Promise.resolve({ success });
    },

    handOffPlan(projectId, planPath, instructions) {
      const idle = findIdleTeamLead(projectId);

      if (idle) {
        // Reuse the idle team-lead — send it the plan via message
        const message = instructions
          ? `Execute the plan at: ${planPath}\n\nAdditional instructions:\n${instructions}`
          : `Execute the plan at: ${planPath}\n\nRead the plan file, decompose into tasks, and begin execution.`;

        agentManager.sendMessage(idle.agentSessionId, message);

        agentLogger.info(
          `[WorkspaceSessionManager] Plan handed off to existing team-lead ${String(idle.key.index)} (session ${idle.agentSessionId})`,
        );

        sendEvent('event:workspace.planHandedOff', {
          projectId,
          planPath,
          sessionId: idle.agentSessionId,
          teamLeadIndex: idle.key.index,
        });

        return {
          sessionId: idle.agentSessionId,
          teamLeadIndex: idle.key.index,
          action: 'reused' as const,
        };
      }

      // No idle team-lead — spawn a new mortal one with the plan
      const existing = [...sessions.values()].filter(
        (s) => s.key.projectId === projectId && s.key.type === SESSION_TYPE_TEAM_LEAD,
      );
      const nextIndex = existing.length;
      const projectPath = getProjectPath(projectId);

      const prompt = instructions
        ? `You are Team Lead ${String(nextIndex + 1)}. Your plan file is at: ${planPath}\n\nAdditional instructions:\n${instructions}\n\nRead the plan file, decompose into tasks, and begin execution.`
        : `You are Team Lead ${String(nextIndex + 1)}. Your plan file is at: ${planPath}. Read the plan file, decompose into tasks, and begin execution.`;

      const key: SessionKey = { projectId, type: SESSION_TYPE_TEAM_LEAD, index: nextIndex };
      const keyStr = keyToString(key);

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

      const sessionId = provisionAndSpawnTeamLead(
        projectId,
        projectPath,
        nextIndex,
        prompt,
        planPath,
      );

      sessions.set(keyStr, { ...session, agentSessionId: sessionId, status: 'live' });
      sendEvent(EVENT_SESSION_READY, {
        projectId,
        sessionKey: key,
        sessionId,
      });

      sendEvent('event:workspace.planHandedOff', {
        projectId,
        planPath,
        sessionId,
        teamLeadIndex: nextIndex,
      });

      agentLogger.info(
        `[WorkspaceSessionManager] Plan handed off to new team-lead ${String(nextIndex)} (session ${sessionId})`,
      );

      return {
        sessionId,
        teamLeadIndex: nextIndex,
        action: 'spawned' as const,
      };
    },

    executeTask(projectId, taskDescription, planPath) {
      const idle = findIdleTeamLead(projectId);

      if (idle) {
        const message = planPath
          ? `Execute this task. Reference plan at: ${planPath}\n\nTask:\n${taskDescription}`
          : `Execute this task:\n\n${taskDescription}`;

        agentManager.sendMessage(idle.agentSessionId, message);

        agentLogger.info(
          `[WorkspaceSessionManager] Task sent to existing team-lead ${String(idle.key.index)}`,
        );

        return {
          sessionId: idle.agentSessionId,
          teamLeadIndex: idle.key.index,
          action: 'reused' as const,
        };
      }

      // Spawn a new mortal team-lead with the task
      const existing = [...sessions.values()].filter(
        (s) => s.key.projectId === projectId && s.key.type === SESSION_TYPE_TEAM_LEAD,
      );
      const nextIndex = existing.length;
      const projectPath = getProjectPath(projectId);

      const prompt = planPath
        ? `You are Team Lead ${String(nextIndex + 1)}. Reference plan at: ${planPath}\n\nExecute this task:\n${taskDescription}`
        : `You are Team Lead ${String(nextIndex + 1)}. Execute this task:\n\n${taskDescription}`;

      const key: SessionKey = { projectId, type: SESSION_TYPE_TEAM_LEAD, index: nextIndex };
      const keyStr = keyToString(key);

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

      const sessionId = provisionAndSpawnTeamLead(
        projectId,
        projectPath,
        nextIndex,
        prompt,
        planPath,
      );

      sessions.set(keyStr, { ...session, agentSessionId: sessionId, status: 'live' });
      sendEvent(EVENT_SESSION_READY, {
        projectId,
        sessionKey: key,
        sessionId,
      });

      agentLogger.info(
        `[WorkspaceSessionManager] Task sent to new team-lead ${String(nextIndex)}`,
      );

      return {
        sessionId,
        teamLeadIndex: nextIndex,
        action: 'spawned' as const,
      };
    },

    provisionTeammate(projectId, agentRole, slug, teamName, taskInstructions) {
      const projectPath = getProjectPath(projectId);

      const { worktreePath, branch } = provisioner.provision({
        projectPath,
        agentType: 'teammate',
        agentRole,
        slug,
        teamName,
        taskInstructions,
      });

      // Track for cleanup
      teammateSlugs.set(`${projectId}:${slug}`, projectPath);

      agentLogger.info(
        `[WorkspaceSessionManager] Teammate ${agentRole} provisioned at ${worktreePath}`,
      );

      return { worktreePath, branch };
    },

    teardownTeammate(projectId, slug) {
      const lookupKey = `${projectId}:${slug}`;
      const projectPath = teammateSlugs.get(lookupKey);
      if (!projectPath) {
        return { success: false };
      }

      provisioner.teardown(projectPath, slug);
      teammateSlugs.delete(lookupKey);

      agentLogger.info(`[WorkspaceSessionManager] Teammate ${slug} worktree torn down`);
      return { success: true };
    },

    dispose() {
      // Clean up all sessions
      for (const [keyStr, session] of sessions.entries()) {
        if (session.agentSessionId) {
          agentManager.stopSession(session.agentSessionId);
        }
        if (session.key.type === SESSION_TYPE_TEAM_LEAD) {
          const slug = worktreeSlugs.get(keyStr);
          if (slug) {
            provisioner.teardown(session.projectPath, slug);
          }
        }
      }

      // Clean up all teammate worktrees
      for (const [lookupKey, projectPath] of teammateSlugs.entries()) {
        const slug = lookupKey.split(':').slice(1).join(':');
        provisioner.teardown(projectPath, slug);
      }

      sessions.clear();
      worktreeSlugs.clear();
      teammateSlugs.clear();
    },
  };
}
