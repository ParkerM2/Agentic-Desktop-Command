import { createServer as createHttpsServer, type Server as HttpsServer } from 'node:https';

import type { AdcDatabase } from '@main/db';
import type { ReplicationEngine } from '@main/features/peers/replication-engine';
import { serviceLogger } from '@main/lib/logger';

import { createPairServer, type PairServer } from './pair-server';
import {
  createWsTransport,
  type WsTransport,
  type WsTransportRemotePeer,
  type WsTransportSelfIdentity,
} from './ws-transport';

import type { PeerPairing } from './peer-pairing';
import type { PeerStore } from './peer-store';
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
  selfIdentity: { peerId: string; pubkey: string; sign: (msg: Uint8Array) => Uint8Array };
  /**
   * Paired-peer store, owned by `peers-service` and passed through (audit M6).
   * Used by `ws-transport` to authenticate inbound HELLO signatures.
   */
  peerStore: PeerStore;
  /**
   * Pairing helper, owned by `peers-service` and passed through (audit M6).
   */
  pairing: PeerPairing;
  listenPort: number; // 0 = OS-assigned
  host?: string;
  schemaHash: string;
  remoteUrl?: string;
  remotePeer?: WsTransportRemotePeer;
  onPinIssued?: (info: { sessionId: string; pin: string; initiatorPeerId: string; initiatorDisplayName?: string }) => void;
  /**
   * Notified once an inbound peer's HELLO signature verifies — surfaced from
   * `ws-transport` so the service can update presence state.
   */
  onConnected?: (info: { peerId: string }) => void;
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

  // Audit M6: peerStore + pairing are owned by `peers-service` and passed
  // in here, not re-constructed.
  const { pairing, peerStore } = deps;

  const pair = await createPairServer({
    tls: deps.tls,
    pairing,
    peerStore,
    selfIdentity: { peerId: deps.selfIdentity.peerId, pubkey: deps.selfIdentity.pubkey },
    selfFingerprint: deps.tls.fingerprint,
    listenPort: port,
    host,
    onPinIssued: deps.onPinIssued,
    existingServer: httpsServer,
  });

  const wsSelfIdentity: WsTransportSelfIdentity = {
    peerId: deps.selfIdentity.peerId,
    sign: deps.selfIdentity.sign,
  };
  const ws = await createWsTransport({
    engine: deps.engine,
    listenPort: port,
    remoteUrl: deps.remoteUrl ?? '',
    schemaHash: deps.schemaHash,
    remotePeer: deps.remotePeer,
    existingHttpsServer: httpsServer,
    peerStore,
    selfIdentity: wsSelfIdentity,
    onConnected: deps.onConnected,
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
