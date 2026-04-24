import { WebSocket, WebSocketServer, type RawData } from 'ws';

import type { Op } from '@shared/replication/op-types';

import type { ReplicationEngine } from '@main/features/peers/replication-engine';
import { serviceLogger } from '@main/lib/logger';


export interface WsTransportDeps {
  engine: ReplicationEngine;
  listenPort: number; // 0 = OS-assigned
  remoteUrl: string;  // '' = don't connect out
  schemaHash: string;
}

export interface WsTransport {
  listenPort: () => number;
  isConnected: () => boolean;
  close: () => Promise<void>;
}

interface WireFrame {
  type: 'HELLO' | 'OPS' | 'PING';
  payload?: unknown;
}

interface HelloPayload {
  schemaHash: string;
}

function dataToString(data: RawData): string {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return Buffer.from(data).toString('utf8');
}

export async function createWsTransport(deps: WsTransportDeps): Promise<WsTransport> {
  const { engine, remoteUrl } = deps;

  let outSocket: WebSocket | null = null;
  const incomingSockets = new Set<WebSocket>();

  const wss = new WebSocketServer({ port: deps.listenPort, host: '127.0.0.1' });
  await new Promise<void>((resolve) => {
    wss.once('listening', () => { resolve(); });
  });
  const addr = wss.address();
  if (addr === null || typeof addr === 'string') {
    throw new Error('WebSocketServer returned unexpected address');
  }
  const actualPort = addr.port;

  function send(ws: WebSocket, frame: WireFrame): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame));
    }
  }

  function broadcastOp(op: Op): void {
    const frame: WireFrame = { type: 'OPS', payload: { ops: [op] } };
    const str = JSON.stringify(frame);
    if (outSocket?.readyState === WebSocket.OPEN) outSocket.send(str);
    for (const ws of incomingSockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(str);
    }
  }

  function handleFrame(ws: WebSocket, raw: string): void {
    let frame: WireFrame;
    try {
      frame = JSON.parse(raw) as WireFrame;
    } catch {
      return;
    }
    if (frame.type === 'HELLO') {
      const helloPayload = frame.payload as HelloPayload | undefined;
      if (helloPayload?.schemaHash !== deps.schemaHash) {
        serviceLogger.warn(
          { local: deps.schemaHash, remote: helloPayload?.schemaHash },
          'peers.wsTransport schema mismatch — closing socket',
        );
        ws.close(4001, 'schema mismatch');
        return;
      }
      return;
    }
    if (frame.type === 'OPS') {
      const payload = (frame.payload ?? {}) as { ops?: unknown };
      if (!Array.isArray(payload.ops)) {
        serviceLogger.warn({ payload }, 'peers.wsTransport.OPS frame missing ops array');
        return;
      }
      for (const op of payload.ops as Op[]) {
        try {
          engine.applyRemoteOp(op);
        } catch (err) {
          serviceLogger.error({ err }, 'peers.wsTransport.applyRemoteOp threw');
        }
      }
    }
    // PING is a no-op in Phase 1
  }

  wss.on('connection', (ws) => {
    incomingSockets.add(ws);
    ws.on('message', (data: RawData) => { handleFrame(ws, dataToString(data)); });
    ws.on('close', () => incomingSockets.delete(ws));
    send(ws, {
      type: 'HELLO',
      payload: { schemaHash: deps.schemaHash } satisfies HelloPayload,
    });
  });

  let shuttingDown = false;
  function dial(): void {
    if (!remoteUrl || shuttingDown) return;
    const ws = new WebSocket(remoteUrl);
    outSocket = ws;
    ws.on('open', () => {
      send(ws, {
        type: 'HELLO',
        payload: { schemaHash: deps.schemaHash } satisfies HelloPayload,
      });
    });
    ws.on('message', (data: RawData) => { handleFrame(ws, dataToString(data)); });
    ws.on('close', () => {
      outSocket = null;
      if (!shuttingDown) {
        setTimeout(dial, 1000);
      }
    });
    ws.on('error', (err) => {
      serviceLogger.warn({ err }, 'peers.wsTransport.dial error');
    });
  }
  if (remoteUrl) dial();

  const unsubscribe = engine.onLocalOp((op) => broadcastOp(op));

  return {
    listenPort: () => actualPort,
    isConnected: () =>
      outSocket?.readyState === WebSocket.OPEN || incomingSockets.size > 0,
    async close() {
      shuttingDown = true;
      unsubscribe();
      if (outSocket) outSocket.close();
      for (const ws of incomingSockets) ws.close();
      await new Promise<void>((resolve) => {
        wss.close(() => { resolve(); });
      });
    },
  };
}
