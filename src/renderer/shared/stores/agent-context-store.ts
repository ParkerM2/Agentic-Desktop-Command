/**
 * Agent Context Store — Global agent state + actions
 *
 * Provides a single Zustand store that any component can import to:
 * - Read active workspace sessions (primary, team-leads)
 * - Hand off plans to team-leads
 * - Execute tasks via team-leads
 * - Send messages to any agent session
 * - Provision/teardown teammate worktrees
 *
 * This store is the global coordination layer for agent operations.
 * It wraps the workspace IPC channels so components don't need to
 * know about projectId threading or session lookup.
 */

import { create } from 'zustand';

import type { WorkspaceSession } from '@shared/ipc/workspace';
import type { AgentError, AgentSessionDetail, ToolCallSummary } from '@shared/types/agent-session-detail';

import { ipc } from '@renderer/shared/lib/ipc';

// ─── Types ──────────────────────────────────────────────────

export interface HandOffResult {
  sessionId: string;
  teamLeadIndex: number;
  action: 'spawned' | 'reused';
}

export interface ProvisionResult {
  worktreePath: string;
  branch: string;
}

interface AgentContextState {
  /** Active workspace sessions for the current project */
  sessions: WorkspaceSession[];
  /** Whether sessions are currently loading */
  isLoading: boolean;
  /** Last error from an agent action */
  lastError: string | null;
  /** Detailed agent session records (from agent-dashboard IPC) */
  agentSessions: AgentSessionDetail[];
  /** Recent messages per session (sessionId -> last 50 messages) */
  recentMessages: Record<string, unknown[]>;
  /** Recent tool calls per session (sessionId -> last 20 tool calls) */
  recentToolCalls: Record<string, ToolCallSummary[]>;
  /** Errors per session (sessionId -> errors) */
  errors: Record<string, AgentError[]>;
  /** Task-to-agent mapping (slug -> sessionIds) */
  taskAgentMap: Record<string, string[]>;

  // ── Setters (called by AgentContextHydrator) ────────────
  setSessions: (sessions: WorkspaceSession[]) => void;
  setIsLoading: (loading: boolean) => void;
  clearError: () => void;
  setAgentSessions: (sessions: AgentSessionDetail[]) => void;
  addRecentMessage: (sessionId: string, message: unknown) => void;
  addToolCall: (sessionId: string, toolCall: ToolCallSummary) => void;
  addError: (sessionId: string, error: AgentError) => void;
  mapTaskAgent: (slug: string, sessionId: string) => void;

  // ── Actions ─────────────────────────────────────────────
  /** Fetch paginated session log entries via IPC */
  fetchSessionLog: (sessionId: string, offset?: number, limit?: number) => Promise<unknown[]>;
  /** Fetch git diff for a session's working branch */
  fetchGitDiff: (sessionId: string) => Promise<string>;
  /** Hand off a plan file to a team-lead. Resolves projectId from layout store. */
  handOffPlan: (projectId: string, planPath: string, instructions?: string) => Promise<HandOffResult>;
  /** Send an ad-hoc task to a team-lead. */
  executeTask: (projectId: string, taskDescription: string, planPath?: string) => Promise<HandOffResult>;
  /** Send a message to any active session. */
  sendMessage: (sessionId: string, message: string) => Promise<boolean>;
  /** Provision a worktree for a teammate agent. */
  provisionTeammate: (
    projectId: string,
    agentRole: string,
    slug: string,
    teamName: string,
    taskInstructions?: string,
  ) => Promise<ProvisionResult>;
  /** Tear down a teammate worktree. */
  teardownTeammate: (projectId: string, slug: string) => Promise<boolean>;
  /** Spawn a new mortal team-lead. */
  spawnTeamLead: (projectId: string, planPath?: string) => Promise<WorkspaceSession>;
  /** Stop a mortal team-lead. */
  stopTeamLead: (projectId: string, index: number) => Promise<boolean>;
}

// ─── Helpers ────────────────────────────────────────────────

function getActiveTeamLeads(sessions: WorkspaceSession[]): WorkspaceSession[] {
  return sessions
    .filter((s) => s.key.type === 'team-lead' && s.status === 'live')
    .sort((a, b) => a.key.index - b.key.index);
}

function getPrimarySession(sessions: WorkspaceSession[]): WorkspaceSession | undefined {
  return sessions.find((s) => s.key.type === 'primary' && s.status === 'live');
}

// ─── Store ──────────────────────────────────────────────────

export const useAgentContext = create<AgentContextState>((set, _get) => ({
  sessions: [],
  isLoading: false,
  lastError: null,
  agentSessions: [],
  recentMessages: {},
  recentToolCalls: {},
  errors: {},
  taskAgentMap: {},

  setSessions: (sessions) => set({ sessions }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clearError: () => set({ lastError: null }),

  setAgentSessions: (agentSessions) => set({ agentSessions }),

  addRecentMessage: (sessionId, message) =>
    set((state) => {
      const existing = state.recentMessages[sessionId] ?? [];
      const updated = [...existing, message].slice(-50);
      return { recentMessages: { ...state.recentMessages, [sessionId]: updated } };
    }),

  addToolCall: (sessionId, toolCall) =>
    set((state) => {
      const existing = state.recentToolCalls[sessionId] ?? [];
      const updated = [...existing, toolCall].slice(-20);
      return { recentToolCalls: { ...state.recentToolCalls, [sessionId]: updated } };
    }),

  addError: (sessionId, error) =>
    set((state) => {
      const existing = state.errors[sessionId] ?? [];
      return { errors: { ...state.errors, [sessionId]: [...existing, error] } };
    }),

  mapTaskAgent: (slug, sessionId) =>
    set((state) => {
      const existing = state.taskAgentMap[slug] ?? [];
      if (existing.includes(sessionId)) {
        return state;
      }
      return { taskAgentMap: { ...state.taskAgentMap, [slug]: [...existing, sessionId] } };
    }),

  async fetchSessionLog(sessionId, offset, limit) {
    const result = await ipc('agent-dashboard.getSessionLog', { sessionId, offset, limit });
    return result;
  },

  async fetchGitDiff(sessionId) {
    const result = await ipc('agent-dashboard.getGitDiff', { sessionId });
    return result.diff;
  },

  async handOffPlan(projectId, planPath, instructions) {
    set({ lastError: null });
    try {
      const result = await ipc('workspace.handOffPlan', { projectId, planPath, instructions });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hand-off failed';
      set({ lastError: message });
      throw error;
    }
  },

  async executeTask(projectId, taskDescription, planPath) {
    set({ lastError: null });
    try {
      const result = await ipc('workspace.executeTask', { projectId, taskDescription, planPath });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Task execution failed';
      set({ lastError: message });
      throw error;
    }
  },

  async sendMessage(sessionId, message) {
    try {
      const result = await ipc('workspace.sendMessage', { sessionId, message });
      return result.success;
    } catch {
      return false;
    }
  },

  async provisionTeammate(projectId, agentRole, slug, teamName, taskInstructions) {
    const result = await ipc('workspace.provisionTeammate', {
      projectId,
      agentRole,
      slug,
      teamName,
      taskInstructions,
    });
    return result;
  },

  async teardownTeammate(projectId, slug) {
    const result = await ipc('workspace.teardownTeammate', { projectId, slug });
    return result.success;
  },

  async spawnTeamLead(projectId, planPath) {
    set({ lastError: null });
    try {
      const result = await ipc('workspace.spawnTeamLead', { projectId, planPath });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Spawn failed';
      set({ lastError: message });
      throw error;
    }
  },

  async stopTeamLead(projectId, index) {
    const result = await ipc('workspace.stopTeamLead', { projectId, index });
    return result.success;
  },
}));

// ─── Derived Selectors ──────────────────────────────────────

/** Get active team-lead sessions sorted by index */
useAgentContext.getActiveTeamLeads = function (): WorkspaceSession[] {
  return getActiveTeamLeads(useAgentContext.getState().sessions);
};

/** Get primary session if live */
useAgentContext.getPrimarySession = function (): WorkspaceSession | undefined {
  return getPrimarySession(useAgentContext.getState().sessions);
};

// Augment the type so callers see the static methods
declare module 'zustand' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- augmentation
  interface StoreApi<T> {
    getActiveTeamLeads?: () => WorkspaceSession[];
    getPrimarySession?: () => WorkspaceSession | undefined;
  }
}
