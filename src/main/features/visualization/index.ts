/**
 * Visualization Service
 *
 * Factory for the VisualizationService interface.
 * Provides codebase graph building, agent teams data (from progress/), and session log.
 */

import { buildAgentTeamsData } from './agent-teams';
import { buildCodebaseGraph } from './codebase-graph';
import { buildSessionLog } from './session-log';

import type {
  AgentTeamsData,
  CodebaseGraph,
  SessionLogPage,
} from './types';
import type { AgentManagerService } from '../../services/agent-manager/agent-manager-service';

// ─── Service Interface ────────────────────────────────────────

export interface VisualizationService {
  /**
   * Builds a codebase dependency graph for the given project directory.
   * Reads source files synchronously and returns the full graph.
   */
  getCodebaseGraph: (projectPath: string) => CodebaseGraph;

  /**
   * Returns agent teams data for the given project.
   * Reads from progress/ and queries AgentManagerService for live session state.
   */
  getAgentTeams: (projectPath: string) => AgentTeamsData;

  /**
   * Returns a paginated page of a Claude session log.
   */
  getSessionLog: (opts: {
    projectPath: string;
    feature: string;
    agentName: string;
    sid?: string | null;
    cursor?: number;
  }) => SessionLogPage;
}

// ─── Factory ──────────────────────────────────────────────────

/**
 * Creates a VisualizationService instance.
 * The service is stateless — each call reads from disk and returns.
 *
 * @param agentManagerService - Used to query live session status for agent teams.
 */
export function createVisualizationService(
  agentManagerService: AgentManagerService,
): VisualizationService {
  return {
    getCodebaseGraph(projectPath: string): CodebaseGraph {
      return buildCodebaseGraph(projectPath);
    },

    getAgentTeams(projectPath: string): AgentTeamsData {
      return buildAgentTeamsData(projectPath, agentManagerService);
    },

    getSessionLog(opts: {
      projectPath: string;
      feature: string;
      agentName: string;
      sid?: string | null;
      cursor?: number;
    }): SessionLogPage {
      return buildSessionLog({
        projectPath: opts.projectPath,
        agentName: opts.agentName,
        feature: opts.feature,
        sid: opts.sid ?? null,
        cursor: opts.cursor ?? 0,
      });
    },
  };
}
