/**
 * useMcpTool — Hook for calling MCP tools
 *
 * Provides a mutation for calling MCP tools via the IPC bridge.
 */

import { useMutation, useQuery } from '@tanstack/react-query';

import { ipc } from '@renderer/shared/lib/ipc';

import { communicationsKeys } from './queryKeys';

export interface McpToolCallParams {
  server: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

/**
 * Mutation hook for calling MCP tools.
 */
export function useMcpToolCall() {
  return useMutation({
    mutationFn: async (params: McpToolCallParams): Promise<McpToolResult> => {
      return await ipc('mcp.callTool', params);
    },
  });
}

/**
 * Query hook for getting MCP connection state.
 */
export function useMcpConnectionState(server: string) {
  return useQuery({
    queryKey: communicationsKeys.mcpConnection(server),
    queryFn: () => ipc('mcp.getConnectionState', { server }),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

/**
 * Query hook for listing connected MCP servers.
 */
export function useMcpConnectedServers() {
  return useQuery({
    queryKey: communicationsKeys.mcpConnected(),
    queryFn: () => ipc('mcp.listConnected', {}),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
