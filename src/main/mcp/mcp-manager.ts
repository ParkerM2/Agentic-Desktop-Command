/**
 * MCP Connection Manager
 *
 * Orchestrates multiple MCP client connections.
 * Handles auto-reconnect with configurable backoff,
 * periodic health checks, and connection state events.
 */

import { EventEmitter } from 'node:events';

import { mcpLogger } from '@main/lib/logger';

import { createMcpClient } from './mcp-client';

import type { McpClient } from './mcp-client';
import type { McpRegistry } from './mcp-registry';
import type { McpConnectionState, McpTool, McpToolResult } from './types';

export interface McpManagerDeps {
  registry: McpRegistry;
}

export interface McpManagerConfig {
  /** Enable auto-reconnect on disconnect (default: true). */
  autoReconnect?: boolean;
  /** Initial delay in ms before first reconnect attempt (default: 1000). */
  reconnectBaseDelayMs?: number;
  /** Maximum reconnect delay in ms (default: 30000). */
  reconnectMaxDelayMs?: number;
  /** Multiplier applied to delay after each failed attempt (default: 2). */
  reconnectBackoffMultiplier?: number;
  /** Interval in ms between health checks (default: 60000). 0 to disable. */
  healthCheckIntervalMs?: number;
}

export interface McpManager {
  /** Connect to all registered servers that have autoConnect enabled. */
  connectAll: () => void;
  /** Connect to a specific server by name. */
  connect: (serverName: string) => void;
  /** Disconnect from a specific server by name. */
  disconnect: (serverName: string) => void;
  /** Disconnect from all connected servers and stop health checks. */
  disconnectAll: () => void;
  /** Get the client for a specific server (undefined if not connected). */
  getClient: (serverName: string) => McpClient | undefined;
  /** List names of currently connected servers. */
  listConnected: () => string[];
  /** Get connection state for a specific server. */
  getConnectionState: (serverName: string) => McpConnectionState;
  /** List all tools across all connected servers. */
  listAllTools: () => Array<{ serverName: string; tool: McpTool }>;
  /** Call a tool on a specific server. */
  callTool: (
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ) => Promise<McpToolResult>;
  /** Run a health check on all connected servers. */
  healthCheck: () => void;
  /** Event emitter for manager-level events. */
  events: EventEmitter;
  /** Clean up all connections and timers. */
  dispose: () => void;
}

interface ClientEntry {
  client: McpClient;
  reconnectAttempts: number;
  reconnectTimerId: ReturnType<typeof setTimeout> | null;
}

const DEFAULT_CONFIG: Required<McpManagerConfig> = {
  autoReconnect: true,
  reconnectBaseDelayMs: 1000,
  reconnectMaxDelayMs: 30_000,
  reconnectBackoffMultiplier: 2,
  healthCheckIntervalMs: 60_000,
};

export function createMcpManager(deps: McpManagerDeps, config?: McpManagerConfig): McpManager {
  const { registry } = deps;
  const mergedConfig: Required<McpManagerConfig> = { ...DEFAULT_CONFIG, ...config };
  const events = new EventEmitter();
  const clients = new Map<string, ClientEntry>();
  let healthCheckTimerId: ReturnType<typeof setInterval> | null = null;

  function getReconnectDelay(attempts: number): number {
    const delay =
      mergedConfig.reconnectBaseDelayMs *
      Math.pow(mergedConfig.reconnectBackoffMultiplier, attempts);
    return Math.min(delay, mergedConfig.reconnectMaxDelayMs);
  }

  function scheduleReconnect(serverName: string): void {
    const entry = clients.get(serverName);
    if (!entry) {
      return;
    }

    // Clear any existing reconnect timer
    if (entry.reconnectTimerId !== null) {
      clearTimeout(entry.reconnectTimerId);
    }

    const delay = getReconnectDelay(entry.reconnectAttempts);
    mcpLogger.info(
      `[MCP Manager] Scheduling reconnect for ${serverName} in ${String(delay)}ms (attempt ${String(entry.reconnectAttempts + 1)})`,
    );

    entry.reconnectTimerId = setTimeout(() => {
      entry.reconnectTimerId = null;
      entry.reconnectAttempts += 1;

      const serverConfig = registry.getServer(serverName);
      if (!serverConfig) {
        mcpLogger.info(`[MCP Manager] Server ${serverName} no longer registered, skipping reconnect`);
        return;
      }

      mcpLogger.info(`[MCP Manager] Reconnecting to ${serverName}...`);
      entry.client.connect();
    }, delay);
  }

  function setupClientListeners(serverName: string, client: McpClient): void {
    client.events.on('connected', () => {
      const entry = clients.get(serverName);
      if (entry) {
        entry.reconnectAttempts = 0;
      }
      events.emit('connection-state-changed', serverName, 'connected');
      mcpLogger.info(`[MCP Manager] ${serverName} connected`);
    });

    client.events.on('disconnected', () => {
      events.emit('connection-state-changed', serverName, 'disconnected');
      mcpLogger.info(`[MCP Manager] ${serverName} disconnected`);

      if (mergedConfig.autoReconnect && clients.has(serverName)) {
        scheduleReconnect(serverName);
      }
    });

    client.events.on('error', (_name: string, error: Error) => {
      events.emit('connection-state-changed', serverName, 'error');
      mcpLogger.error(`[MCP Manager] ${serverName} error:`, error.message);

      if (mergedConfig.autoReconnect && clients.has(serverName)) {
        scheduleReconnect(serverName);
      }
    });

    client.events.on('tools-updated', (_name: string, tools: McpTool[]) => {
      events.emit('tools-updated', serverName, tools);
    });
  }

  function connectServer(serverName: string): void {
    // Don't create duplicate clients
    if (clients.has(serverName)) {
      const existing = clients.get(serverName);
      if (existing && !existing.client.isConnected()) {
        existing.client.connect();
      }
      return;
    }

    const serverConfig = registry.getServer(serverName);
    if (!serverConfig) {
      mcpLogger.error(`[MCP Manager] Server "${serverName}" not found in registry`);
      return;
    }

    const client = createMcpClient(serverConfig);
    const entry: ClientEntry = {
      client,
      reconnectAttempts: 0,
      reconnectTimerId: null,
    };

    clients.set(serverName, entry);
    setupClientListeners(serverName, client);
    client.connect();
  }

  function disconnectServer(serverName: string): void {
    const entry = clients.get(serverName);
    if (!entry) {
      return;
    }

    // Cancel any pending reconnect
    if (entry.reconnectTimerId !== null) {
      clearTimeout(entry.reconnectTimerId);
      entry.reconnectTimerId = null;
    }

    entry.client.disconnect();
    clients.delete(serverName);
  }

  function startHealthChecks(): void {
    if (mergedConfig.healthCheckIntervalMs === 0) {
      return;
    }

    stopHealthChecks();
    healthCheckTimerId = setInterval(() => {
      runHealthCheck();
    }, mergedConfig.healthCheckIntervalMs);
  }

  function stopHealthChecks(): void {
    if (healthCheckTimerId !== null) {
      clearInterval(healthCheckTimerId);
      healthCheckTimerId = null;
    }
  }

  function runHealthCheck(): void {
    for (const [serverName, entry] of clients) {
      if (!entry.client.isConnected()) {
        const error = new Error(`Health check: ${serverName} is not connected`);
        events.emit('health-check-failed', serverName, error);
        mcpLogger.info(`[MCP Manager] Health check failed for ${serverName}`);
      }
    }
  }

  return {
    events,

    connectAll() {
      const servers = registry.listServers();
      for (const server of servers) {
        if (server.autoConnect !== false) {
          connectServer(server.name);
        }
      }
      startHealthChecks();
    },

    connect(serverName) {
      connectServer(serverName);
    },

    disconnect(serverName) {
      disconnectServer(serverName);
    },

    disconnectAll() {
      stopHealthChecks();

      // Temporarily disable auto-reconnect during teardown
      const prevAutoReconnect = mergedConfig.autoReconnect;
      mergedConfig.autoReconnect = false;

      const serverNames = [...clients.keys()];
      for (const name of serverNames) {
        disconnectServer(name);
      }

      mergedConfig.autoReconnect = prevAutoReconnect;
    },

    getClient(serverName) {
      const entry = clients.get(serverName);
      if (!entry) {
        return;
      }
      return entry.client;
    },

    listConnected() {
      const connected: string[] = [];
      for (const [name, entry] of clients) {
        if (entry.client.isConnected()) {
          connected.push(name);
        }
      }
      return connected;
    },

    getConnectionState(serverName) {
      const entry = clients.get(serverName);
      if (!entry) {
        return 'disconnected';
      }
      return entry.client.getState();
    },

    listAllTools() {
      const allTools: Array<{ serverName: string; tool: McpTool }> = [];
      for (const [serverName, entry] of clients) {
        if (entry.client.isConnected()) {
          const serverTools = entry.client.listTools();
          for (const tool of serverTools) {
            allTools.push({ serverName, tool });
          }
        }
      }
      return allTools;
    },

    callTool(serverName, toolName, args) {
      const entry = clients.get(serverName);
      if (!entry) {
        return Promise.reject(new Error(`No client found for server "${serverName}"`));
      }
      return entry.client.callTool(toolName, args);
    },

    healthCheck() {
      runHealthCheck();
    },

    dispose() {
      stopHealthChecks();

      // Disable auto-reconnect during disposal
      mergedConfig.autoReconnect = false;

      const serverNames = [...clients.keys()];
      for (const name of serverNames) {
        disconnectServer(name);
      }

      events.removeAllListeners();
    },
  };
}
