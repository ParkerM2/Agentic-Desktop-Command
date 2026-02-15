/**
 * Hub Connection Manager
 *
 * Manages the connection lifecycle to the hub backend:
 * - Persist connection config (URL, API key via safeStorage)
 * - Connect/disconnect with health check verification
 * - WebSocket connection for real-time updates
 * - Auto-reconnect on disconnection
 * - Emit events for connection state changes
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app, safeStorage } from 'electron';

import type { HubConnection } from '@shared/types';

import { createHubClient } from './hub-client';

import type { HubClient } from './hub-client';
import type { IpcRouter } from '../../ipc/router';

export type HubConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface HubConnectionManager {
  /** Get the current hub connection config. */
  getConnection: () => HubConnection | null;
  /** Configure and save hub connection (API key encrypted via safeStorage). */
  configure: (hubUrl: string, apiKey: string) => HubConnection;
  /** Enable/disable the hub connection. */
  setEnabled: (enabled: boolean) => HubConnection | null;
  /** Attempt to connect to the hub (health check + WebSocket). */
  connect: () => Promise<{ success: boolean; error?: string }>;
  /** Disconnect from the hub. */
  disconnect: () => void;
  /** Get the current connection status. */
  getStatus: () => HubConnectionStatus;
  /** Get the HTTP client for hub API calls. */
  getClient: () => HubClient;
  /** Check if hub is available (configured + connected). */
  isAvailable: () => boolean;
  /** Remove hub configuration entirely. */
  removeConfig: () => void;
  /** Register a callback for raw WebSocket messages. */
  onWebSocketMessage: (callback: (data: unknown) => void) => void;
  /** Clean up resources. */
  dispose: () => void;
}

interface PersistedHubConfig {
  hubUrl: string;
  /** Base64-encoded encrypted API key. */
  encryptedApiKey: string;
  enabled: boolean;
  lastConnected?: string;
}

const RECONNECT_INTERVAL_MS = 30_000;
const CONFIG_FILENAME = 'hub-config.json';

function getConfigPath(): string {
  return join(app.getPath('userData'), CONFIG_FILENAME);
}

function encryptApiKey(apiKey: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(apiKey);
    return encrypted.toString('base64');
  }
  // Fallback: base64 encoding (not truly secure, but functional)
  return Buffer.from(apiKey, 'utf-8').toString('base64');
}

function decryptApiKey(encoded: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(encoded, 'base64');
    return safeStorage.decryptString(buffer);
  }
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

function loadConfig(): PersistedHubConfig | null {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as PersistedHubConfig;
  } catch {
    console.error('[Hub] Failed to load hub config');
    return null;
  }
}

function saveConfig(config: PersistedHubConfig): void {
  const configPath = getConfigPath();
  const dir = join(configPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

function deleteConfig(): void {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    unlinkSync(configPath);
  }
}

function configToConnection(
  config: PersistedHubConfig,
  status: HubConnectionStatus,
): HubConnection {
  return {
    hubUrl: config.hubUrl,
    apiKey: decryptApiKey(config.encryptedApiKey),
    enabled: config.enabled,
    lastConnected: config.lastConnected,
    status,
  };
}

interface WsEventData {
  type: string;
  entity: string;
  action: string;
  id: string;
  data?: Record<string, unknown>;
}

function emitTaskEvent(
  emitter: IpcRouter,
  eventData: WsEventData,
): void {
  const projectId =
    (eventData.data?.projectId as string | undefined) ??
    (eventData.data?.project_id as string | undefined) ??
    '';
  const taskPayload = { taskId: eventData.id, projectId };

  if (eventData.action === 'created') {
    emitter.emit('event:hub.tasks.created', taskPayload);
  } else if (eventData.action === 'deleted') {
    emitter.emit('event:hub.tasks.deleted', taskPayload);
  } else if (eventData.action === 'completed') {
    const rawResult = eventData.data?.result;
    emitter.emit('event:hub.tasks.completed', {
      ...taskPayload,
      result: rawResult === 'failure' ? 'failure' : 'success',
    });
  } else if (eventData.action === 'progress') {
    emitter.emit('event:hub.tasks.progress', {
      taskId: eventData.id,
      progress: typeof eventData.data?.progress === 'number' ? eventData.data.progress : 0,
      phase: typeof eventData.data?.phase === 'string' ? eventData.data.phase : '',
    });
  } else {
    // Default: updated (covers status changes, field edits, etc.)
    emitter.emit('event:hub.tasks.updated', taskPayload);
  }
}

function routeWebSocketEvent(
  emitter: IpcRouter,
  eventData: WsEventData,
): void {
  switch (eventData.entity) {
    case 'tasks':
      emitTaskEvent(emitter, eventData);
      break;

    case 'projects':
      emitter.emit('event:hub.projects.updated', { projectId: eventData.id });
      break;

    case 'workspaces':
      emitter.emit('event:hub.workspaces.updated', { workspaceId: eventData.id });
      break;

    case 'devices':
      if (eventData.action === 'online') {
        emitter.emit('event:hub.devices.online', {
          deviceId: eventData.id,
          name: typeof eventData.data?.name === 'string' ? eventData.data.name : '',
        });
      } else if (eventData.action === 'offline') {
        emitter.emit('event:hub.devices.offline', { deviceId: eventData.id });
      }
      break;

    default:
      // Fallback for unknown entities
      emitter.emit('event:project.updated', { projectId: eventData.id });
      break;
  }
}

export function createHubConnectionManager(router: IpcRouter): HubConnectionManager {
  let persistedConfig = loadConfig();
  let status: HubConnectionStatus = 'disconnected';
  let wsConnection: WebSocket | null = null;
  let reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
  const messageListeners: Array<(data: unknown) => void> = [];

  function getConnectionForClient(): HubConnection | null {
    if (!persistedConfig) {
      return null;
    }
    return configToConnection(persistedConfig, status);
  }

  const client = createHubClient(getConnectionForClient);

  function setStatus(newStatus: HubConnectionStatus): void {
    if (status === newStatus) {
      return;
    }
    status = newStatus;
    router.emit('event:hub.connectionChanged', { status: newStatus });
    console.log(`[Hub] Connection status: ${newStatus}`);
  }

  function connectWebSocket(): void {
    if (!persistedConfig) {
      return;
    }

    const connection = configToConnection(persistedConfig, status);
    const wsUrl = `${connection.hubUrl.replace(/^http/, 'ws')}/ws`;

    try {
      wsConnection = new WebSocket(wsUrl);

      wsConnection.addEventListener('open', () => {
        console.log('[Hub] WebSocket connected, sending auth message');
        // Send auth message as first message (required by hub's first-message auth protocol)
        if (wsConnection?.readyState === WebSocket.OPEN) {
          const authMessage = JSON.stringify({
            type: 'auth',
            apiKey: connection.apiKey,
          });
          wsConnection.send(authMessage);
        }
      });

      wsConnection.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(String(event.data)) as WsEventData;
          console.log(`[Hub] WS event: ${data.entity}.${data.action} (${data.id})`);

          // Emit entity-specific IPC events for query invalidation
          routeWebSocketEvent(router, data);

          // Forward raw message to registered listeners (e.g. webhook relay)
          for (const listener of messageListeners) {
            listener(data);
          }
        } catch {
          // Ignore malformed messages
        }
      });

      wsConnection.addEventListener('close', () => {
        console.log('[Hub] WebSocket disconnected');
        wsConnection = null;
        if (persistedConfig?.enabled && status === 'connected') {
          scheduleReconnect();
        }
      });

      wsConnection.addEventListener('error', () => {
        console.error('[Hub] WebSocket error');
        wsConnection = null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'WebSocket error';
      console.error('[Hub] Failed to create WebSocket:', message);
    }
  }

  function disconnectWebSocket(): void {
    if (wsConnection) {
      try {
        wsConnection.close();
      } catch {
        // Already closed
      }
      wsConnection = null;
    }
  }

  function scheduleReconnect(): void {
    if (reconnectTimerId !== null) {
      return;
    }
    reconnectTimerId = setTimeout(() => {
      reconnectTimerId = null;
      if (persistedConfig?.enabled) {
        console.log('[Hub] Attempting reconnect...');
        void performConnect();
      }
    }, RECONNECT_INTERVAL_MS);
  }

  function cancelReconnect(): void {
    if (reconnectTimerId !== null) {
      clearTimeout(reconnectTimerId);
      reconnectTimerId = null;
    }
  }

  async function performConnect(): Promise<{ success: boolean; error?: string }> {
    if (!persistedConfig) {
      return { success: false, error: 'Hub not configured' };
    }

    setStatus('connecting');

    const healthResult = await client.healthCheck();
    if (!healthResult.success) {
      setStatus('error');
      scheduleReconnect();
      return { success: false, error: healthResult.error ?? 'Health check failed' };
    }

    // Health check passed — mark as connected
    const updatedConfig: PersistedHubConfig = {
      ...persistedConfig,
      lastConnected: new Date().toISOString(),
    };
    persistedConfig = updatedConfig;
    saveConfig(persistedConfig);
    setStatus('connected');

    // Establish WebSocket for real-time updates
    connectWebSocket();

    return { success: true };
  }

  return {
    getConnection() {
      if (!persistedConfig) {
        return null;
      }
      return configToConnection(persistedConfig, status);
    },

    configure(hubUrl, apiKey) {
      const trimmedUrl = hubUrl.replace(/\/+$/, '');
      const encryptedApiKey = encryptApiKey(apiKey);

      persistedConfig = {
        hubUrl: trimmedUrl,
        encryptedApiKey,
        enabled: true,
      };

      saveConfig(persistedConfig);
      console.log(`[Hub] Configured hub: ${trimmedUrl}`);

      return configToConnection(persistedConfig, status);
    },

    setEnabled(enabled) {
      if (!persistedConfig) {
        return null;
      }

      persistedConfig.enabled = enabled;
      saveConfig(persistedConfig);

      if (!enabled) {
        disconnectWebSocket();
        cancelReconnect();
        setStatus('disconnected');
      }

      return configToConnection(persistedConfig, status);
    },

    connect() {
      return performConnect();
    },

    disconnect() {
      cancelReconnect();
      disconnectWebSocket();
      setStatus('disconnected');
    },

    getStatus() {
      return status;
    },

    getClient() {
      return client;
    },

    isAvailable() {
      return persistedConfig !== null && persistedConfig.enabled && status === 'connected';
    },

    removeConfig() {
      disconnectWebSocket();
      cancelReconnect();
      deleteConfig();
      persistedConfig = null;
      setStatus('disconnected');
      console.log('[Hub] Configuration removed');
    },

    onWebSocketMessage(callback) {
      messageListeners.push(callback);
    },

    dispose() {
      cancelReconnect();
      disconnectWebSocket();
    },
  };
}
