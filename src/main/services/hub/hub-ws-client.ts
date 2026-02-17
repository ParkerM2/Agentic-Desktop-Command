/**
 * Hub WebSocket Client
 *
 * WebSocket connection management with auto-reconnect.
 * Handles auth handshake, message parsing, and reconnection scheduling.
 */

import type { HubConnection } from '@shared/types';

import { routeWebSocketEvent } from './hub-event-mapper';

import type { WsEventData } from './hub-event-mapper';
import type { IpcRouter } from '../../ipc/router';

const RECONNECT_INTERVAL_MS = 30_000;

export interface HubWsClientOptions {
  router: IpcRouter;
  getConnection: () => HubConnection;
  isEnabledAndConnected: () => boolean;
  messageListeners: Array<(data: unknown) => void>;
  scheduleConnect: () => void;
}

export interface HubWsClient {
  connect: () => void;
  disconnect: () => void;
  cancelReconnect: () => void;
}

export function createHubWsClient(options: HubWsClientOptions): HubWsClient {
  const { router, getConnection, isEnabledAndConnected, messageListeners, scheduleConnect } =
    options;
  let wsConnection: WebSocket | null = null;
  let reconnectTimerId: ReturnType<typeof setTimeout> | null = null;

  function scheduleReconnect(): void {
    if (reconnectTimerId !== null) {
      return;
    }
    reconnectTimerId = setTimeout(() => {
      reconnectTimerId = null;
      scheduleConnect();
    }, RECONNECT_INTERVAL_MS);
  }

  function cancelReconnect(): void {
    if (reconnectTimerId !== null) {
      clearTimeout(reconnectTimerId);
      reconnectTimerId = null;
    }
  }

  function disconnect(): void {
    if (wsConnection) {
      try {
        wsConnection.close();
      } catch {
        // Already closed
      }
      wsConnection = null;
    }
  }

  function connect(): void {
    const connection = getConnection();
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
        if (isEnabledAndConnected()) {
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

  return { connect, disconnect, cancelReconnect };
}
