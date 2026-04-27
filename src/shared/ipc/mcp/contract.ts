/**
 * MCP (Model Context Protocol) IPC Contract
 *
 * Invoke channels for MCP tool calls and server connections.
 */

import { z } from 'zod';

import { MCP } from './channels';

export const mcpInvoke = {
  [MCP.CALL.TOOL]: {
    input: z.object({
      server: z.string(),
      tool: z.string(),
      args: z.record(z.string(), z.unknown()),
    }),
    output: z.object({
      content: z.array(
        z.object({
          type: z.string(),
          text: z.string(),
        }),
      ),
      isError: z.boolean(),
    }),
  },
  [MCP.LIST.CONNECTED]: {
    input: z.object({}),
    output: z.array(z.string()),
  },
  [MCP.GET['CONNECTION-STATE']]: {
    input: z.object({ server: z.string() }),
    output: z.enum(['disconnected', 'connecting', 'connected', 'error']),
  },
} as const;
