/**
 * MCP Bridge — exposes bus commands as MCP tool definitions.
 *
 * Any AI session can invoke any registered command through the bus
 * by calling the tool with the channel name.
 */

import { createScopedLogger } from '../lib/logger';

import type { CommandBus } from './command-bus';

const logger = createScopedLogger('bus-mcp-bridge');

export interface BusMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface BusMcpBridge {
  getTools: () => BusMcpTool[];
  callTool: (name: string, args: unknown) => Promise<unknown>;
}

export function createBusMcpBridge(bus: CommandBus): BusMcpBridge {
  return {
    getTools() {
      return bus.getRegistry()
        .filter((cmd) => cmd.isMutation)
        .map((cmd) => ({
          name: cmd.channel,
          description: `${cmd.verb} ${cmd.noun ?? ''} in ${cmd.domain}`.trim(),
          inputSchema: { type: 'object', properties: {}, additionalProperties: true },
        }));
    },

    async callTool(name: string, args: unknown) {
      logger.info(`MCP tool call: ${name}`);
      const result = await bus.dispatch(name, args, { type: 'agent', name: 'mcp-bridge' });
      if (result.status === 'error') {
        throw new Error(result.error ?? 'Command failed');
      }
      return result.output;
    },
  };
}
