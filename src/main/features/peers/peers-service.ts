import type { AdcDatabase } from '@main/db';
import { serviceLogger } from '@main/lib/logger';

import { gcWatermarkFromObserved } from './gc-watermark';
import { GC_INTERVAL_MS, LOOPBACK_HOST } from './peer-constants';
import { postJsonPinned } from './peer-http';
import { getOrCreatePeerIdentity, type PeerIdentity } from './peer-identity';
import { createPeerMdns, type PeerAdvertisement, type PeerMdns } from './peer-mdns';
import { createPeerPairing } from './peer-pairing';
import { createPeerServer, type PeerServer } from './peer-server';
import { createPeerStore, type PairedPeer, type PeerStore } from './peer-store';
import { resolvePeerTls, type PeerTlsMaterial } from './peer-tls';

import type { ReplicationEngine } from './replication-engine';

export interface PeersServiceDeps {
  db: AdcDatabase;
  dataDir: string;
  engine: ReplicationEngine;
  listenPort: number;
  schemaHash: string;
  preferMdns: boolean;
  displayName?: string | null;
  /** Pre-resolved identity from the registry. When omitted, falls back to
   * `getOrCreatePeerIdentity(dataDir)` for back-compat with existing call
   * sites and tests. */
  identity?: PeerIdentity;
  /** Pre-constructed peer store from the registry. When omitted, falls back
   * to `createPeerStore(db)`. */
  peerStore?: PeerStore;
}

export interface PeersServiceSelfIdentity {
  peerId: string;
  pubkey: string;
  fingerprint: string;
  displayName: string | null;
}

export interface DiscoveredPeerWithPaired extends Omit<PeerAdvertisement, 'displayName'> {
  displayName: string | null;
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

// internal: exported for tests — keep usage limited to peers-service.ts itself
// and `tests/unit/peers/safe-fan-out.test.ts`. Audit M4: dedupes the
// fan-out boilerplate in pin/discovery/trust handler iteration.
export function safeFanOut<T>(
  handlers: Set<(value: T) => void>,
  value: T,
  label: string,
): void {
  for (const h of handlers) {
    try {
      h(value);
    } catch (err) {
      serviceLogger.warn({ err }, `peers.peersService ${label} handler threw`);
    }
  }
}

export async function createPeersService(deps: PeersServiceDeps): Promise<PeersService> {
  const identity = deps.identity ?? getOrCreatePeerIdentity(deps.dataDir, {
    allowPlaintext: process.env.ADC_PEERS_ALLOW_PLAINTEXT_IDENTITY === '1',
  });
  const tls: PeerTlsMaterial = await resolvePeerTls(deps.dataDir, identity.peerIdFull);
  const peerStore: PeerStore = deps.peerStore ?? createPeerStore(deps.db);
  const pairingHelper = createPeerPairing();

  const pinHandlers = new Set<(info: PinIssuedInfo) => void>();
  const discoveryHandlers = new Set<(peers: DiscoveredPeerWithPaired[]) => void>();
  const trustHandlers = new Set<(event: TrustChangedEvent) => void>();

  const displayName = deps.displayName ?? null;

  const server: PeerServer = await createPeerServer({
    db: deps.db,
    engine: deps.engine,
    tls,
    selfIdentity: {
      peerId: identity.peerIdFull,
      pubkey: identity.pubkey,
      sign: identity.sign,
    },
    // Audit M6: pass through the singletons rather than letting peer-server
    // construct duplicates.
    peerStore,
    pairing: pairingHelper,
    listenPort: deps.listenPort,
    host: LOOPBACK_HOST,
    schemaHash: deps.schemaHash,
    onConnected: (info) => {
      // Inbound peer authenticated — bump lastConnectedAt for presence.
      try { peerStore.updateLastConnectedAt(info.peerId, Date.now()); }
      catch (err) { serviceLogger.warn({ err, peerId: info.peerId }, 'peers.peersService updateLastConnectedAt threw'); }
    },
    onPinIssued: (info) => {
      const enriched: PinIssuedInfo = {
        sessionId: info.sessionId,
        pin: info.pin,
        initiatorPeerId: info.initiatorPeerId,
        initiatorDisplayName: info.initiatorDisplayName ?? null,
        issuedAt: Date.now(),
      };
      safeFanOut(pinHandlers, enriched, 'onPinIssued');
    },
  });

  const listenPort = server.port();

  function enrichDiscovered(ads: PeerAdvertisement[]): DiscoveredPeerWithPaired[] {
    return ads.map((ad) => ({
      ...ad,
      // Normalize displayName to `string | null` to match DiscoveredPeerSchema
      // (audit H4). PeerAdvertisement still uses `string | undefined` upstream.
      displayName: ad.displayName ?? null,
      isPaired: peerStore.getByPeerId(ad.peerId) !== null,
    }));
  }

  function fireDiscoveryChanged(ads: PeerAdvertisement[]): void {
    const enriched = enrichDiscovered(ads);
    safeFanOut(discoveryHandlers, enriched, 'onDiscoveryChanged');
  }

  function fireTrustChanged(event: TrustChangedEvent): void {
    safeFanOut(trustHandlers, event, 'onTrustChanged');
  }

  function computeGcWatermark(): string | null {
    return gcWatermarkFromObserved(
      peerStore.listAll().map((p) => ({
        peerId: p.peerId,
        revokedAt: p.revokedAt,
        lastSeenHlc: p.lastSeenHlc,
      })),
    );
  }

  // Audit M3: dedupe initial-call vs periodic-call GC bodies.
  function runGcTick(): void {
    try {
      const watermark = computeGcWatermark();
      if (watermark === null) return;
      const result = deps.engine.gcOpLog(watermark);
      if (result.deleted > 0) {
        serviceLogger.info(
          { deleted: result.deleted, watermarkHlc: watermark },
          'peers.opLog.gc',
        );
      }
    } catch (err) {
      serviceLogger.warn({ err }, 'peers.peersService gc tick threw');
    }
  }

  let initialGcTimer: ReturnType<typeof setTimeout> | null = null;
  let gcInterval: ReturnType<typeof setInterval> | null = null;

  function startGc(): void {
    initialGcTimer = setTimeout(runGcTick, 0);
    initialGcTimer.unref();

    gcInterval = setInterval(runGcTick, GC_INTERVAL_MS);
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
      const res = await postJsonPinned<{ sessionId: string; challenge: string }>(
        url,
        input.fingerprint,
        body,
      );
      return { sessionId: res.sessionId, challenge: res.challenge };
    },

    async pairConfirm(input) {
      const url = `https://${input.host}:${String(input.port)}/pair/confirm`;
      const pinHmac = pairingHelper.computePinHmac(input.pin, input.challenge);
      const res = await postJsonPinned<{ peerId: string; pubkey: string; fingerprint: string }>(
        url,
        input.fingerprint,
        {
          sessionId: input.sessionId,
          pinHmac,
        },
      );

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
      if (initialGcTimer !== null) {
        clearTimeout(initialGcTimer);
        initialGcTimer = null;
      }
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
