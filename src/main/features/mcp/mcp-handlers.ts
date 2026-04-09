/**
 * MCP IPC handlers
 *
 * Exposes MCP tool calls to the renderer process.
 */

import { MCP } from '@shared/ipc/misc/mcp.channels';

import type { IpcRouter } from '../../ipc/router';
import type { McpManager } from '../../mcp/mcp-manager';

export function registerMcpHandlers(router: IpcRouter, mcpManager: McpManager): void {
  router.handle(MCP.CALL.TOOL, async ({ server, tool, args }) => {
    return await mcpManager.callTool(server, tool, args);
  });

  router.handle(MCP.LIST.CONNECTED, () => {
    return Promise.resolve(mcpManager.listConnected());
  });

  router.handle(MCP.GET['CONNECTION-STATE'], ({ server }) => {
    return Promise.resolve(mcpManager.getConnectionState(server));
  });
}
