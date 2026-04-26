import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';

import type { AdcDatabase } from '@main/db';
import { serviceLogger } from '@main/lib/logger';

import { getOrCreatePeerIdentity } from './peer-identity';
import { createPeerMdns, type PeerAdvertisement, type PeerMdns } from './peer-mdns';
import { createPeerPairing } from './peer-pairing';
import { createPeerServer, type PeerServer } from './peer-server';
import { createPeerStore, type PairedPeer, type PeerStore } from './peer-store';
import { resolvePeerTls, type PeerTlsMaterial } from './peer-tls';
import { pinnedCheckServerIdentity } from './peer-tls-pin';

import type { ReplicationEngine } from './replication-engine';

export interface PeersServiceDeps {
  db: AdcDatabase;
  dataDir: string;
  engine: ReplicationEngine;
  listenPort: number;
  schemaHash: string;
  preferMdns: boolean;
  displayName?: string | null;
}

export interface PeersServiceSelfIdentity {
  peerId: string;
  pubkey: string;
  fingerprint: string;
  displayName: string | null;
}

export interface DiscoveredPeerWithPaired extends PeerAdvertisement {
  isPaired: boolean;
}

export interface PinIssuedInfo {
  sessionId: string;
  pin: string;
  initiatorPeerId: string;
  initiatorDisplayName?: string | null;
  issuedAt: number;
}

export interface TrustChangedEvent {
  peerId: string;
  action: 'added' | 'revoked' | 'updated';
}

export interface PairInitInput {
  host: string;
  port: number;
  fingerprint: string;
  displayName?: string | null;
}

export interface PairInitOutput {
  sessionId: string;
  challenge: string;
}

export interface PairConfirmInput {
  host: string;
  port: number;
  fingerprint: string;
  sessionId: string;
  challenge: string;
  pin: string;
  displayName?: string | null;
}

export interface PairConfirmOutput {
  peerId: string;
  pubkey: string;
  fingerprint: string;
}

export interface PeersService {
  getIdentity: () => PeersServiceSelfIdentity;
  getListenPort: () => number;
  listPaired: () => PairedPeer[];
  listDiscovered: () => DiscoveredPeerWithPaired[];
  pairInit: (input: PairInitInput) => Promise<PairInitOutput>;
  pairConfirm: (input: PairConfirmInput) => Promise<PairConfirmOutput>;
  revoke: (peerId: string) => { revoked: boolean };
  onPinIssued: (handler: (info: PinIssuedInfo) => void) => () => void;
  onDiscoveryChanged: (handler: (peers: DiscoveredPeerWithPaired[]) => void) => () => void;
  onTrustChanged: (handler: (event: TrustChangedEvent) => void) => () => void;
  dispose: () => Promise<void>;
}

async function postJson(
  url: string,
  expectedFingerprint: string,
  body: unknown,
): Promise<unknown> {
  const u = new URL(url);
  // Pin the peer's leaf cert at TLS handshake time. With this in place we can
  // (and must) keep `rejectUnauthorized: true` — fingerprint mismatch surfaces
  // as a handshake error on the request, not a post-`'end'` check.
  const agent = new HttpsAgent({
    rejectUnauthorized: true,
    checkServerIdentity: pinnedCheckServerIdentity(expectedFingerprint),
  });
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  return await new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };
    const req = httpsRequest(
      {
        host: u.hostname,
        port: Number(u.port),
        path: u.pathname,
        method: 'POST',
        agent,
        headers: {
          'content-type': 'application/json',
          'content-length': String(payload.length),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode !== 200) {
            settle(() => { reject(new Error(`http_${String(res.statusCode)}: ${raw}`)); });
            return;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            settle(() => { reject(new Error('invalid_json_response')); });
            return;
          }
          settle(() => { resolve(parsed); });
        });
      },
    );
    req.on('error', (err) => {
      settle(() => { reject(err); });
    });
    req.write(payload);
    req.end();
  });
}

export async function createPeersService(deps: PeersServiceDeps): Promise<PeersService> {
  const identity = getOrCreatePeerIdentity(deps.dataDir, {
    allowPlaintext: process.env.ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY === '1',
  });
  const tls: PeerTlsMaterial = await resolvePeerTls(deps.dataDir, identity.peerIdFull);
  const peerStore: PeerStore = createPeerStore(deps.db);
  const pairingHelper = createPeerPairing();

  const pinHandlers = new Set<(info: PinIssuedInfo) => void>();
  const discoveryHandlers = new Set<(peers: DiscoveredPeerWithPaired[]) => void>();
  const trustHandlers = new Set<(event: TrustChangedEvent) => void>();

  const displayName = deps.displayName ?? null;

  const server: PeerServer = await createPeerServer({
    db: deps.db,
    engine: deps.engine,
    tls,
    selfIdentity: { peerId: identity.peerIdFull, pubkey: identity.pubkey },
    listenPort: deps.listenPort,
    host: '127.0.0.1',
    schemaHash: deps.schemaHash,
    onPinIssued: (info) => {
      const enriched: PinIssuedInfo = {
        sessionId: info.sessionId,
        pin: info.pin,
        initiatorPeerId: info.initiatorPeerId,
        initiatorDisplayName: info.initiatorDisplayName ?? null,
        issuedAt: Date.now(),
      };
      for (const h of pinHandlers) {
        try { h(enriched); }
        catch (err) { serviceLogger.warn({ err }, 'peers.peersService onPinIssued handler threw'); }
      }
    },
  });

  const listenPort = server.port();

  function enrichDiscovered(ads: PeerAdvertisement[]): DiscoveredPeerWithPaired[] {
    return ads.map((ad) => ({
      ...ad,
      isPaired: peerStore.getByPeerId(ad.peerId) !== null,
    }));
  }

  function fireDiscoveryChanged(ads: PeerAdvertisement[]): void {
    const enriched = enrichDiscovered(ads);
    for (const h of discoveryHandlers) {
      try { h(enriched); }
      catch (err) { serviceLogger.warn({ err }, 'peers.peersService onDiscoveryChanged handler threw'); }
    }
  }

  function fireTrustChanged(event: TrustChangedEvent): void {
    for (const h of trustHandlers) {
      try { h(event); }
      catch (err) { serviceLogger.warn({ err }, 'peers.peersService onTrustChanged handler threw'); }
    }
  }

  const GC_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

  function computeGcWatermark(): string | null {
    const peers = peerStore.listAll().filter((p) => p.revokedAt === null);
    if (peers.length === 0) return null;
    const seen = peers
      .map((p) => p.lastSeenHlc)
      .filter((h): h is string => h !== null);
    if (seen.length !== peers.length) {
      // At least one active peer hasn't been seen — refuse to GC.
      return null;
    }
    return seen.reduce((min, h) => (h < min ? h : min));
  }

  let gcInterval: ReturnType<typeof setInterval> | null = null;

  function startGc(): void {
    const initialGc = setTimeout(() => {
      const watermark = computeGcWatermark();
      if (watermark === null) return;
      const result = deps.engine.gcOpLog(watermark);
      if (result.deleted > 0) {
        serviceLogger.info(
          { deleted: result.deleted, watermarkHlc: watermark, initial: true },
          'peers.opLog.gc',
        );
      }
    }, 0);
    initialGc.unref();

    gcInterval = setInterval(() => {
      const watermark = computeGcWatermark();
      if (watermark === null) return;
      const result = deps.engine.gcOpLog(watermark);
      if (result.deleted > 0) {
        serviceLogger.info(
          { deleted: result.deleted, watermarkHlc: watermark },
          'peers.opLog.gc',
        );
      }
    }, GC_INTERVAL_MS);
    gcInterval.unref();
  }

  let mdns: PeerMdns | null = null;
  let mdnsUnsub: (() => void) | null = null;
  if (deps.preferMdns) {
    mdns = createPeerMdns({
      selfPeerId: identity.peerIdFull,
      fingerprint: tls.fingerprint,
      port: listenPort,
      displayName: displayName ?? undefined,
    });
    mdnsUnsub = mdns.onChange((ads) => { fireDiscoveryChanged(ads); });
    try {
      await mdns.start();
    } catch (err) {
      serviceLogger.warn({ err }, 'peers.peersService mdns.start failed');
    }
  }

  startGc();

  return {
    getIdentity() {
      return {
        peerId: identity.peerIdFull,
        pubkey: identity.pubkey,
        fingerprint: tls.fingerprint,
        displayName,
      };
    },

    getListenPort() {
      return listenPort;
    },

    listPaired() {
      return peerStore.listAll();
    },

    listDiscovered() {
      return enrichDiscovered(mdns?.getSnapshot() ?? []);
    },

    async pairInit(input) {
      const url = `https://${input.host}:${String(input.port)}/pair/init`;
      const body = {
        peerId: identity.peerIdFull,
        pubkey: identity.pubkey,
        fingerprint: tls.fingerprint,
        displayName: input.displayName ?? displayName ?? undefined,
      };
      const res = (await postJson(url, input.fingerprint, body)) as {
        sessionId: string;
        challenge: string;
      };
      return { sessionId: res.sessionId, challenge: res.challenge };
    },

    async pairConfirm(input) {
      const url = `https://${input.host}:${String(input.port)}/pair/confirm`;
      const pinHmac = pairingHelper.computePinHmac(input.pin, input.challenge);
      const res = (await postJson(url, input.fingerprint, {
        sessionId: input.sessionId,
        pinHmac,
      })) as { peerId: string; pubkey: string; fingerprint: string };

      peerStore.upsert({
        peerId: res.peerId,
        pubkey: res.pubkey,
        certFingerprint: res.fingerprint,
        displayName: input.displayName ?? null,
        pairedAt: Date.now(),
      });
      fireTrustChanged({ peerId: res.peerId, action: 'added' });

      return { peerId: res.peerId, pubkey: res.pubkey, fingerprint: res.fingerprint };
    },

    revoke(peerId) {
      const existing = peerStore.getByPeerId(peerId);
      if (existing === null) return { revoked: false };
      if (existing.revokedAt !== null) return { revoked: false };
      peerStore.revoke(peerId, Date.now());
      fireTrustChanged({ peerId, action: 'revoked' });
      return { revoked: true };
    },

    onPinIssued(handler) {
      pinHandlers.add(handler);
      return () => { pinHandlers.delete(handler); };
    },

    onDiscoveryChanged(handler) {
      discoveryHandlers.add(handler);
      return () => { discoveryHandlers.delete(handler); };
    },

    onTrustChanged(handler) {
      trustHandlers.add(handler);
      return () => { trustHandlers.delete(handler); };
    },

    async dispose() {
      if (gcInterval !== null) {
        clearInterval(gcInterval);
        gcInterval = null;
      }
      const localUnsub = mdnsUnsub;
      const localMdns = mdns;
      mdnsUnsub = null;
      mdns = null;
      if (localUnsub) {
        try { localUnsub(); }
        catch (err) { serviceLogger.warn({ err }, 'peers.peersService mdns unsub threw'); }
      }
      if (localMdns) {
        try { await localMdns.stop(); }
        catch (err) { serviceLogger.warn({ err }, 'peers.peersService mdns.stop threw'); }
      }
      try { await server.close(); }
      catch (err) { serviceLogger.warn({ err }, 'peers.peersService server.close threw'); }
      pinHandlers.clear();
      discoveryHandlers.clear();
      trustHandlers.clear();
    },
  };
}
