import type { WebSocket } from 'ws';

import type { WsBroadcastMessage } from '../lib/types.js';

const authenticatedClients = new Set<WebSocket>();
const deviceSocketMap = new Map<string, WebSocket>();

/**
 * Add an authenticated client to the broadcast pool.
 * Only call this after the client has been authenticated via the first-message protocol.
 * If a deviceId is provided, the socket is also mapped for point-to-point relay.
 */
export function addAuthenticatedClient(socket: WebSocket, deviceId?: string): void {
  authenticatedClients.add(socket);

  if (deviceId) {
    deviceSocketMap.set(deviceId, socket);
  }

  socket.on('close', () => {
    authenticatedClients.delete(socket);
    if (deviceId) {
      deviceSocketMap.delete(deviceId);
    }
  });

  socket.on('error', () => {
    authenticatedClients.delete(socket);
    if (deviceId) {
      deviceSocketMap.delete(deviceId);
    }
  });
}

/**
 * Get the WebSocket for a specific device by its ID.
 * Returns undefined if the device is not connected.
 */
export function getClientByDeviceId(deviceId: string): WebSocket | undefined {
  const socket = deviceSocketMap.get(deviceId);
  if (socket && socket.readyState === socket.OPEN) {
    return socket;
  }
  return undefined;
}

/**
 * Send a targeted message to a specific device.
 * Returns true if the message was sent, false if the device is not connected.
 */
export function sendToDevice(deviceId: string, payload: Record<string, unknown>): boolean {
  const socket = getClientByDeviceId(deviceId);
  if (!socket) {
    return false;
  }
  socket.send(JSON.stringify(payload));
  return true;
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
