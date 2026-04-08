import type { WebSocket } from 'ws';

import type { WsBroadcastMessage } from '../lib/types.js';

const authenticatedClients = new Set<WebSocket>();

/** Maps deviceId → authenticated WebSocket connection. */
const deviceToSocket = new Map<string, WebSocket>();

/** Maps WebSocket → deviceId (reverse lookup for cleanup). */
const socketToDevice = new Map<WebSocket, string>();

/**
 * Add an authenticated client to the broadcast pool.
 * Only call this after the client has been authenticated via the first-message protocol.
 */
export function addAuthenticatedClient(socket: WebSocket): void {
  authenticatedClients.add(socket);

  socket.on('close', () => {
    authenticatedClients.delete(socket);
    const deviceId = socketToDevice.get(socket);
    if (deviceId !== undefined) {
      deviceToSocket.delete(deviceId);
      socketToDevice.delete(socket);
    }
  });

  socket.on('error', () => {
    authenticatedClients.delete(socket);
    const deviceId = socketToDevice.get(socket);
    if (deviceId !== undefined) {
      deviceToSocket.delete(deviceId);
      socketToDevice.delete(socket);
    }
  });
}

/**
 * Register a deviceId for an authenticated socket.
 * Call this after authentication succeeds and deviceId is known.
 */
export function setClientDeviceId(socket: WebSocket, deviceId: string): void {
  // If this device was previously connected, clean up old socket mapping
  const oldSocket = deviceToSocket.get(deviceId);
  if (oldSocket !== undefined && oldSocket !== socket) {
    socketToDevice.delete(oldSocket);
  }
  deviceToSocket.set(deviceId, socket);
  socketToDevice.set(socket, deviceId);
}

/**
 * Get the WebSocket connection for a given deviceId, or undefined if not connected.
 */
export function getClientByDeviceId(deviceId: string): WebSocket | undefined {
  return deviceToSocket.get(deviceId);
}

export function broadcast(
  entity: string,
  action: WsBroadcastMessage['action'],
  id: string,
  data: unknown,
): void {
  const message: WsBroadcastMessage = {
    type: 'mutation',
    entity,
    action,
    id,
    data,
    timestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify(message);

  for (const client of authenticatedClients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}
