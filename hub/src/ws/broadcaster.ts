import type { WebSocket } from 'ws';

import type { WsBroadcastMessage } from '../lib/types.js';

const clients = new Set<WebSocket>();

export function addClient(socket: WebSocket): void {
  clients.add(socket);

  socket.on('close', () => {
    clients.delete(socket);
  });

  socket.on('error', () => {
    clients.delete(socket);
  });
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

  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}
