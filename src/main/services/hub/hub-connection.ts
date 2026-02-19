/**
 * Hub Connection Manager
 *
 * Facade that orchestrates hub connection lifecycle:
 * - Config persistence (via hub-config-store)
 * - WebSocket real-time updates (via hub-ws-client)
 * - Event mapping (via hub-event-mapper)
 */

import type { HubConnection, HubConnectionStatus } from '@shared/types';

import { hubLogger } from '@main/lib/logger';

import { createHubClient } from './hub-client';
import {
  deleteConfig,
  encryptApiKey,
  loadConfig,
  saveConfig,
} from './hub-config-store';
import { configToConnection } from './hub-event-mapper';
import { createHubWsClient } from './hub-ws-client';

import type { HubClient } from './hub-client';
import type { PersistedHubConfig } from './hub-config-store';
import type { IpcRouter } from '../../ipc/router';

export type { HubConnectionStatus } from '@shared/types';

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

export function createHubConnectionManager(router: IpcRouter): HubConnectionManager {
  let persistedConfig: PersistedHubConfig | null = loadConfig();
  let status: HubConnectionStatus = 'disconnected';
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
    hubLogger.info(`[Hub] Connection status: ${newStatus}`);
  }

  async function performConnect(): Promise<{ success: boolean; error?: string }> {
    if (!persistedConfig) {
      return { success: false, error: 'Hub not configured' };
    }

    setStatus('connecting');

    const healthResult = await client.healthCheck();
    if (!healthResult.success) {
      setStatus('error');
      ws.cancelReconnect();
      return { success: false, error: healthResult.error ?? 'Health check failed' };
    }

    // Health check passed -- mark as connected
    const updatedConfig: PersistedHubConfig = {
      ...persistedConfig,
      lastConnected: new Date().toISOString(),
    };
    persistedConfig = updatedConfig;
    saveConfig(persistedConfig);
    setStatus('connected');

    // Establish WebSocket for real-time updates
    ws.connect();

    return { success: true };
  }

  const ws = createHubWsClient({
    router,
    getConnection: () => {
      if (!persistedConfig) {
        throw new Error('[Hub] getConnection called without config');
      }
      return configToConnection(persistedConfig, status);
    },
    isEnabledAndConnected: () =>
      persistedConfig !== null && persistedConfig.enabled && status === 'connected',
    messageListeners,
    scheduleConnect: () => {
      if (persistedConfig?.enabled) {
        hubLogger.info('[Hub] Attempting reconnect...');
        void performConnect();
      }
    },
  });

  return {
    getConnection() {
      if (!persistedConfig) {
        return null;
      }
      return configToConnection(persistedConfig, status);
    },

    configure(hubUrl, apiKey) {
      const trimmedUrl = hubUrl.replace(/\/+$/, '');
      const encrypted = encryptApiKey(apiKey);

      persistedConfig = {
        hubUrl: trimmedUrl,
        encryptedApiKey: encrypted,
        enabled: true,
      };

      saveConfig(persistedConfig);
      hubLogger.info(`[Hub] Configured hub: ${trimmedUrl}`);

      return configToConnection(persistedConfig, status);
    },

    setEnabled(enabled) {
      if (!persistedConfig) {
        return null;
      }

      persistedConfig.enabled = enabled;
      saveConfig(persistedConfig);

      if (!enabled) {
        ws.disconnect();
        ws.cancelReconnect();
        setStatus('disconnected');
      }

      return configToConnection(persistedConfig, status);
    },

    connect() {
      return performConnect();
    },

    disconnect() {
      ws.cancelReconnect();
      ws.disconnect();
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
      ws.disconnect();
      ws.cancelReconnect();
      deleteConfig();
      persistedConfig = null;
      setStatus('disconnected');
      hubLogger.info('[Hub] Configuration removed');
    },

    onWebSocketMessage(callback) {
      messageListeners.push(callback);
    },

    dispose() {
      ws.cancelReconnect();
      ws.disconnect();
    },
  };
}
