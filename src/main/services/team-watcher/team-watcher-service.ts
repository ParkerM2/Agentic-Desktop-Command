/**
 * TeamWatcher Service — Watch team config for teammate join/leave
 *
 * Watches ~/.claude/teams/<teamName>/config.json using fs.watch.
 * Detects new teammates joining and existing teammates leaving by
 * diffing against a known members set. Debounces file system events
 * (300ms) to handle rapid config rewrites.
 *
 * Layer 1 — Agent Visibility: independent of workflow tracking.
 */

import { existsSync, readFileSync, watch } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { AgentStatus, TeamMember } from '@shared/types/agent-dashboard';

import { appLogger } from '../../lib/logger';

const DEBOUNCE_MS = 300;
const CLAUDE_TEAMS_DIR = join(homedir(), '.claude', 'teams');

export type TeammateJoinedHandler = (member: TeamMember) => void;
export type TeammateLeftHandler = (memberId: string) => void;

export interface TeamWatcherService {
  /** Start watching a team's config.json for membership changes */
  startWatching: (teamName: string) => void;
  /** Stop watching a team */
  stopWatching: (teamName: string) => void;
  /** Get current known members of a team */
  getTeamMembers: (teamName: string) => TeamMember[];
  /** Subscribe to teammate joined events. Returns unsubscribe function. */
  onTeammateJoined: (handler: TeammateJoinedHandler) => () => void;
  /** Subscribe to teammate left events. Returns unsubscribe function. */
  onTeammateLeft: (handler: TeammateLeftHandler) => () => void;
  /** Stop all watchers and clean up */
  dispose: () => void;
}

interface TeamWatchState {
  watcher: ReturnType<typeof watch> | null;
  members: Map<string, TeamMember>;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

const VALID_AGENT_STATUSES = new Set<string>([
  'running',
  'idle',
  'needs-attention',
  'failed',
  'completed',
]);

function isValidAgentStatus(value: unknown): value is AgentStatus {
  return typeof value === 'string' && VALID_AGENT_STATUSES.has(value);
}

/** Parse team config.json and extract members array */
function readTeamConfig(configPath: string): TeamMember[] {
  try {
    if (!existsSync(configPath)) {
      return [];
    }
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as { members?: unknown[] };

    if (!Array.isArray(parsed.members)) {
      return [];
    }

    return parsed.members
      .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
      .map((m) => ({
        agentId: typeof m.agentId === 'string' ? m.agentId : '',
        name: typeof m.name === 'string' ? m.name : '',
        sessionId: typeof m.sessionId === 'string' ? m.sessionId : '',
        tmuxPaneId: typeof m.tmuxPaneId === 'string' ? m.tmuxPaneId : undefined,
        cwd: typeof m.cwd === 'string' ? m.cwd : '',
        status: isValidAgentStatus(m.status) ? m.status : 'running',
      }))
      .filter((m) => m.agentId.length > 0);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    appLogger.warn(`[TeamWatcher] Failed to read team config at ${configPath}: ${msg}`);
    return [];
  }
}

export function createTeamWatcherService(): TeamWatcherService {
  const teams = new Map<string, TeamWatchState>();
  const joinHandlers = new Set<TeammateJoinedHandler>();
  const leftHandlers = new Set<TeammateLeftHandler>();

  function getConfigPath(teamName: string): string {
    return join(CLAUDE_TEAMS_DIR, teamName, 'config.json');
  }

  function diffMembers(
    oldMembers: Map<string, TeamMember>,
    newMembers: TeamMember[],
  ): { joined: TeamMember[]; left: string[] } {
    const newIds = new Set(newMembers.map((m) => m.agentId));
    const joined = newMembers.filter((m) => !oldMembers.has(m.agentId));
    const left: string[] = [];

    for (const id of oldMembers.keys()) {
      if (!newIds.has(id)) {
        left.push(id);
      }
    }

    return { joined, left };
  }

  function handleConfigChange(teamName: string): void {
    const state = teams.get(teamName);
    if (state === undefined) {
      return;
    }

    const configPath = getConfigPath(teamName);
    const newMembers = readTeamConfig(configPath);
    const { joined, left } = diffMembers(state.members, newMembers);

    // Update known members
    state.members.clear();
    for (const member of newMembers) {
      state.members.set(member.agentId, member);
    }

    // Notify joined
    for (const member of joined) {
      appLogger.info(
        `[TeamWatcher] Teammate joined team "${teamName}": ${member.name} (${member.agentId})`,
      );
      for (const handler of joinHandlers) {
        handler(member);
      }
    }

    // Notify left
    for (const memberId of left) {
      appLogger.info(`[TeamWatcher] Teammate left team "${teamName}": ${memberId}`);
      for (const handler of leftHandlers) {
        handler(memberId);
      }
    }
  }

  return {
    startWatching(teamName: string): void {
      if (teams.has(teamName)) {
        appLogger.warn(`[TeamWatcher] Already watching team "${teamName}"`);
        return;
      }

      const configPath = getConfigPath(teamName);
      const configDir = join(CLAUDE_TEAMS_DIR, teamName);

      // Read initial state
      const initialMembers = readTeamConfig(configPath);
      const membersMap = new Map<string, TeamMember>();
      for (const member of initialMembers) {
        membersMap.set(member.agentId, member);
      }

      const state: TeamWatchState = {
        watcher: null,
        members: membersMap,
        debounceTimer: null,
      };

      // Watch the team directory (not just config.json, since some systems
      // replace the file atomically by writing a new file and renaming)
      try {
        state.watcher = watch(configDir, (_eventType, filename) => {
          if (filename !== 'config.json') {
            return;
          }

          // Debounce rapid rewrites
          if (state.debounceTimer !== null) {
            clearTimeout(state.debounceTimer);
          }
          state.debounceTimer = setTimeout(() => {
            handleConfigChange(teamName);
            state.debounceTimer = null;
          }, DEBOUNCE_MS);
        });

        state.watcher.on('error', (error) => {
          appLogger.warn(
            `[TeamWatcher] Watcher error for team "${teamName}": ${error.message}`,
          );
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        appLogger.warn(
          `[TeamWatcher] Failed to start watching team "${teamName}": ${msg}. ` +
            `Directory may not exist yet: ${configDir}`,
        );
      }

      teams.set(teamName, state);
      appLogger.info(
        `[TeamWatcher] Started watching team "${teamName}" (${String(initialMembers.length)} initial members)`,
      );
    },

    stopWatching(teamName: string): void {
      const state = teams.get(teamName);
      if (state === undefined) {
        return;
      }

      if (state.debounceTimer !== null) {
        clearTimeout(state.debounceTimer);
      }
      if (state.watcher !== null) {
        state.watcher.close();
      }

      teams.delete(teamName);
      appLogger.info(`[TeamWatcher] Stopped watching team "${teamName}"`);
    },

    getTeamMembers(teamName: string): TeamMember[] {
      const state = teams.get(teamName);
      if (state === undefined) {
        return [];
      }
      return Array.from(state.members.values());
    },

    onTeammateJoined(handler: TeammateJoinedHandler): () => void {
      joinHandlers.add(handler);
      return () => {
        joinHandlers.delete(handler);
      };
    },

    onTeammateLeft(handler: TeammateLeftHandler): () => void {
      leftHandlers.add(handler);
      return () => {
        leftHandlers.delete(handler);
      };
    },

    dispose(): void {
      for (const [teamName, state] of teams.entries()) {
        if (state.debounceTimer !== null) {
          clearTimeout(state.debounceTimer);
        }
        if (state.watcher !== null) {
          state.watcher.close();
        }
        appLogger.info(`[TeamWatcher] Disposed watcher for team "${teamName}"`);
      }
      teams.clear();
      joinHandlers.clear();
      leftHandlers.clear();
    },
  };
}
