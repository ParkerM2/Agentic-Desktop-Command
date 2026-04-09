/**
 * Visualization IPC Contract
 *
 * Defines invoke channels for the visualization domain:
 * codebase dependency graph, agent teams data, and session log pagination.
 */

import { z } from 'zod';

import { VISUALIZATION } from './channels';
import { AgentTeamsDataSchema, CodebaseGraphSchema, SessionLogPageSchema } from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────────

export const visualizationInvoke = {
  [VISUALIZATION.GET['CODEBASE-GRAPH']]: {
    input: z.object({ projectId: z.string() }),
    output: CodebaseGraphSchema,
  },
  [VISUALIZATION.GET['AGENT-TEAMS']]: {
    input: z.object({ projectId: z.string() }),
    output: AgentTeamsDataSchema,
  },
  [VISUALIZATION.GET['SESSION-LOG']]: {
    input: z.object({
      projectId: z.string(),
      feature: z.string(),
      agentName: z.string(),
      cursor: z.number().optional(),
    }),
    output: SessionLogPageSchema,
  },
} as const;
