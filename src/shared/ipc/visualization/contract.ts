/**
 * Visualization IPC Contract
 *
 * Defines invoke channels for the visualization domain:
 * codebase dependency graph, agent teams data, and session log pagination.
 */

import { z } from 'zod';

import { AgentTeamsDataSchema, CodebaseGraphSchema, SessionLogPageSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────────

export const visualizationInvoke = {
  'visualization.getCodebaseGraph': {
    input: z.object({ projectId: z.string() }),
    output: CodebaseGraphSchema,
  },
  'visualization.getAgentTeams': {
    input: z.object({ projectId: z.string() }),
    output: AgentTeamsDataSchema,
  },
  'visualization.getSessionLog': {
    input: z.object({
      projectId: z.string(),
      feature: z.string(),
      agentName: z.string(),
      cursor: z.number().optional(),
    }),
    output: SessionLogPageSchema,
  },
} as const;
