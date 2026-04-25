import { createServer as createHttpsServer, type Server as HttpsServer } from 'node:https';

import type { AdcDatabase } from '@main/db';
import type { ReplicationEngine } from '@main/features/peers/replication-engine';
import { serviceLogger } from '@main/lib/logger';

import { createPairServer, type PairServer } from './pair-server';
import { createPeerPairing } from './peer-pairing';
import { createPeerStore } from './peer-store';
import { createWsTransport, type WsTransport, type WsTransportRemotePeer } from './ws-transport';

import type { PeerTlsMaterial } from './peer-tls';
import type { AddressInfo } from 'node:net';

/**
 * Unified peer server: one TLS https.Server hosts both the /pair/* HTTP
 * endpoints and the WebSocket sync transport. mDNS therefore advertises a
 * single port and remote peers connect via wss://host:port for sync and
 * https://host:port/pair/* for pairing.
 */
export interface PeerServerDeps {
  db: AdcDatabase;
  engine: ReplicationEngine;
  tls: PeerTlsMaterial;
  selfIdentity: { peerId: string; pubkey: string };
  listenPort: number; // 0 = OS-assigned
  host?: string;
  schemaHash: string;
  remoteUrl?: string;
  remotePeer?: WsTransportRemotePeer;
  onPinIssued?: (info: { sessionId: string; pin: string; initiatorPeerId: string }) => void;
}

export interface PeerServer {
  port: () => number;
  pair: PairServer;
  ws: WsTransport;
  close: () => Promise<void>;
}

export async function createPeerServer(deps: PeerServerDeps): Promise<PeerServer> {
  const host = deps.host ?? '127.0.0.1';
  const httpsServer: HttpsServer = createHttpsServer({ cert: deps.tls.cert, key: deps.tls.key });

  await new Promise<void>((resolve, reject) => {
    httpsServer.once('error', reject);
    httpsServer.listen(deps.listenPort, host, () => {
      httpsServer.removeListener('error', reject);
      resolve();
    });
  });

  const addr = httpsServer.address() as AddressInfo;
  const { port } = addr;

  const pairing = createPeerPairing();
  const peerStore = createPeerStore(deps.db);

  const pair = await createPairServer({
    tls: deps.tls,
    pairing,
    peerStore,
    selfIdentity: deps.selfIdentity,
    selfFingerprint: deps.tls.fingerprint,
    listenPort: port,
    host,
    onPinIssued: deps.onPinIssued,
    existingServer: httpsServer,
  });

  const ws = await createWsTransport({
    engine: deps.engine,
    listenPort: port,
    remoteUrl: deps.remoteUrl ?? '',
    schemaHash: deps.schemaHash,
    remotePeer: deps.remotePeer,
    existingHttpsServer: httpsServer,
  });

  serviceLogger.info({ port, peerId: deps.selfIdentity.peerId }, 'peers.peerServer listening');

  return {
    port: () => port,
    pair,
    ws,
    async close() {
      await pair.close();
      await ws.close();
      await new Promise<void>((resolve) => {
        httpsServer.close(() => { resolve(); });
        httpsServer.closeAllConnections();
      });
    },
  };
}
