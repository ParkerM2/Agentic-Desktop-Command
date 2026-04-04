/**
 * Visualization Service
 *
 * Factory for the VisualizationService interface.
 * Provides codebase graph building and stubs for agent teams and session log
 * (implemented by Task 3).
 */

import { buildAgentTeamsData } from './agent-teams';
import { buildCodebaseGraph } from './codebase-graph';
import { buildSessionLog } from './session-log';

import type {
  AgentTeamsData,
  CodebaseGraph,
  SessionLogPage,
} from './types';

// ─── Service Interface ────────────────────────────────────────

export interface VisualizationService {
  /**
   * Builds a codebase dependency graph for the given project directory.
   * Reads source files synchronously and returns the full graph.
   */
  getCodebaseGraph: (projectPath: string) => CodebaseGraph;

  /**
   * Returns agent teams data for the given project.
   * Reads .claude/tracking/ from the project path.
   *
   * @throws Error('Not implemented') — implemented in Task 3
   */
  getAgentTeams: (projectPath: string) => AgentTeamsData;

  /**
   * Returns a paginated page of a Claude session log.
   *
   * @throws Error('Not implemented') — implemented in Task 3
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
 * No constructor dependencies required.
 */
export function createVisualizationService(): VisualizationService {
  return {
    getCodebaseGraph(projectPath: string): CodebaseGraph {
      return buildCodebaseGraph(projectPath);
    },

    getAgentTeams(projectPath: string): AgentTeamsData {
      return buildAgentTeamsData(projectPath);
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
