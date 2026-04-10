/**
 * Agent Context Store — Track local and relay agent sessions.
 *
 * UI-only Zustand store that maintains a unified view of all active agent
 * sessions regardless of source (local process or hub relay). Each entry
 * carries a `source` discriminator so the UI can render appropriate badges
 * and controls.
 *
 * This store holds **ephemeral view state only** — no domain data, no IPC
 * calls, no React Query imports.
 */

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────

export type SessionSource = 'local' | 'relay';
export type SessionStatus = 'active' | 'ended' | 'disconnected' | 'reclaimed';

export interface AgentSessionEntry {
  readonly sessionId: string;
  readonly projectId: string;
  readonly source: SessionSource;
  readonly status: SessionStatus;
  readonly agentRole: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
}

interface AgentContextState {
  /** All tracked sessions keyed by sessionId */
  sessions: Record<string, AgentSessionEntry>;

  /** Add or update a session entry */
  upsertSession: (entry: AgentSessionEntry) => void;

  /** Update the status (and optionally endedAt) of an existing session */
  updateSessionStatus: (
    sessionId: string,
    status: SessionStatus,
    endedAt?: string,
  ) => void;

  /** Remove a session from tracking */
  removeSession: (sessionId: string) => void;

  /** Remove all sessions for a given project */
  clearProjectSessions: (projectId: string) => void;
}

// ── Store ──────────────────────────────────────────────────────

export const useAgentContextStore = create<AgentContextState>((set) => ({
  sessions: {},

  upsertSession(entry) {
    set((state) => ({
      sessions: { ...state.sessions, [entry.sessionId]: entry },
    }));
  },

  updateSessionStatus(sessionId, status, endedAt) {
    set((state) => {
      if (!(sessionId in state.sessions)) return state;
      const existing = state.sessions[sessionId];
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...existing,
            status,
            endedAt: endedAt ?? existing.endedAt,
          },
        },
      };
    });
  },

  removeSession(sessionId) {
    set((state) => {
      const { [sessionId]: _removed, ...rest } = state.sessions;
      return { sessions: rest };
    });
  },

  clearProjectSessions(projectId) {
    set((state) => {
      const filtered: Record<string, AgentSessionEntry> = {};
      for (const [id, entry] of Object.entries(state.sessions)) {
        if (entry.projectId !== projectId) {
          filtered[id] = entry;
        }
      }
      return { sessions: filtered };
    });
  },
}));
