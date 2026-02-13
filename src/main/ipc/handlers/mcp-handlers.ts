/**
 * MCP IPC handlers
 *
 * Exposes MCP tool calls to the renderer process.
 */

import type { McpManager } from '../../mcp/mcp-manager';
import type { IpcRouter } from '../router';

export function registerMcpHandlers(router: IpcRouter, mcpManager: McpManager): void {
  router.handle('mcp.callTool', async ({ server, tool, args }) => {
    return await mcpManager.callTool(server, tool, args);
  });

  router.handle('mcp.listConnected', () => {
    return Promise.resolve(mcpManager.listConnected());
  });

  router.handle('mcp.getConnectionState', ({ server }) => {
    return Promise.resolve(mcpManager.getConnectionState(server));
  });
}
