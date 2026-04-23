/**
 * Hub WebSocket Client
 *
 * WebSocket connection management with auto-reconnect.
 * Handles auth handshake, message parsing, and reconnection scheduling.
 */

import { HUB_EVENTS } from '@shared/ipc/hub/channels';
import type { HubConnection } from '@shared/types';

import { hubLogger } from '@main/lib/logger';

import { routeWebSocketEvent } from './hub-event-mapper';

import type { WsEventData } from './hub-event-mapper';
import type { IpcRouter } from '../../ipc/router';

const BASE_RECONNECT_MS = 30_000;
const MAX_RECONNECT_MS = 300_000;

/** WS close code emitted by the hub when an API key has been revoked. */
export const WS_CLOSE_REVOKED = 4003;

export interface HubWsClientOptions {
  router: IpcRouter;
  getConnection: () => HubConnection;
  isEnabledAndConnected: () => boolean;
  messageListeners: Array<(data: unknown) => void>;
  scheduleConnect: () => void;
  /** Resolves the active hubId at close-time for revocation events. */
  getActiveHubId: () => string | null;
}

export interface HubWsClient {
  connect: () => void;
  disconnect: () => void;
  cancelReconnect: () => void;
}

export function createHubWsClient(options: HubWsClientOptions): HubWsClient {
  const {
    router,
    getConnection,
    isEnabledAndConnected,
    messageListeners,
    scheduleConnect,
    getActiveHubId,
  } = options;
  let wsConnection: WebSocket | null = null;
  let reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  // Set once the server sends WS close 4003 (revocation). Suppresses
  // auto-reconnect until the caller re-pairs and creates a new client.
  let revoked = false;

  function parseRevokeReason(raw: string | undefined): string {
    const fallback = 'Access revoked';
    if (!raw) return fallback;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'reason' in parsed &&
        typeof (parsed as { reason: unknown }).reason === 'string' &&
        (parsed as { reason: string }).reason.length > 0
      ) {
        return (parsed as { reason: string }).reason;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  function getReconnectDelay(): number {
    return Math.min(BASE_RECONNECT_MS * 2 ** reconnectAttempt, MAX_RECONNECT_MS);
  }

  function scheduleReconnect(): void {
    if (reconnectTimerId !== null) {
      return;
    }
    const delay = getReconnectDelay();
    reconnectAttempt += 1;
    hubLogger.info(`[Hub] Scheduling reconnect in ${delay / 1000}s (attempt ${reconnectAttempt})`);
    reconnectTimerId = setTimeout(() => {
      reconnectTimerId = null;
      scheduleConnect();
    }, delay);
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
        reconnectAttempt = 0;
        hubLogger.info('[Hub] WebSocket connected, sending auth message');
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
          hubLogger.info(`[Hub] WS event: ${data.entity}.${data.action} (${data.id})`);

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

      wsConnection.addEventListener('close', (event: CloseEvent) => {
        hubLogger.info(`[Hub] WebSocket disconnected (code=${event.code})`);
        wsConnection = null;

        if (event.code === WS_CLOSE_REVOKED) {
          revoked = true;
          const reason = parseRevokeReason(event.reason);
          const hubId = getActiveHubId();
          hubLogger.warn(
            `[Hub] Access revoked by server (hubId=${hubId ?? 'null'}): ${reason}`,
          );
          if (hubId) {
            router.emit(HUB_EVENTS.REVOKED, { hubId, reason });
          }
          // Do NOT auto-reconnect — the user must re-pair.
          return;
        }

        if (revoked) {
          // A previous 4003 already latched; ignore subsequent closes.
          return;
        }

        if (isEnabledAndConnected()) {
          scheduleReconnect();
        }
      });

      wsConnection.addEventListener('error', () => {
        hubLogger.error('[Hub] WebSocket error');
        wsConnection = null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'WebSocket error';
      hubLogger.error('[Hub] Failed to create WebSocket:', message);
    }
  }

  return { connect, disconnect, cancelReconnect };
}
