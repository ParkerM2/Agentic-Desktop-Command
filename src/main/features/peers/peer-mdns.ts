import { EventEmitter } from 'node:events';

import { Bonjour } from 'bonjour-service';

import {
  MDNS_PROTOCOL,
  MDNS_SERVICE_TYPE,
  PEER_ID_SHORT_LEN,
} from './peer-constants';

export interface PeerAdvertisement {
  peerId: string;
  fingerprint: string;
  displayName?: string;
  host: string;
  port: number;
  lastSeenAt: number;
}

export interface PeerMdnsOpts {
  selfPeerId: string;
  fingerprint: string;
  port: number;
  displayName?: string;
  /** Override bonjour factory for tests. */
  bonjour?: () => Bonjour;
  /** Override Date.now for tests. */
  now?: () => number;
}

export interface PeerMdns {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getSnapshot: () => PeerAdvertisement[];
  onChange: (handler: (peers: PeerAdvertisement[]) => void) => () => void;
}

interface UpService {
  name?: string;
  port?: number;
  addresses?: string[];
  txt?: Record<string, string>;
}

/**
 * Create an mDNS advertiser + browser for `_adc-peer._tcp.local`.
 *
 * TXT record:
 *   - peerId: full SHA-256 of pubkey (64 hex chars)
 *   - fp:     TLS cert SHA-256 fingerprint (hex)
 *   - name:   optional display name
 *   - v:      protocol version ("1")
 *
 * Filters out our own ad by `peerId`. Emits 'change' on up/down.
 */
export function createPeerMdns(opts: PeerMdnsOpts): PeerMdns {
  const byPeerId = new Map<string, PeerAdvertisement>();
  const emitter = new EventEmitter();
  const now = opts.now ?? Date.now;
  let bonjour: Bonjour | null = null;
  let browser: ReturnType<Bonjour['find']> | null = null;
  let published: { stop: () => void } | null = null;

  function snapshot(): PeerAdvertisement[] {
    return [...byPeerId.values()];
  }

  function fireChange(): void {
    emitter.emit('change', snapshot());
  }

  function handleUp(svc: UpService): void {
    const txt = svc.txt ?? {};
    const { peerId, fp } = txt;
    if (!peerId || !fp) return;
    if (peerId === opts.selfPeerId) return;

    const addresses = Array.isArray(svc.addresses) ? svc.addresses : [];
    const host = addresses[0] ?? '';
    if (!host) return;

    const ad: PeerAdvertisement = {
      peerId,
      fingerprint: fp,
      displayName: txt.name,
      host,
      port: typeof svc.port === 'number' ? svc.port : 0,
      lastSeenAt: now(),
    };
    byPeerId.set(peerId, ad);
    fireChange();
  }

  function handleDown(svc: UpService): void {
    const peerId = svc.txt?.peerId;
    if (!peerId) return;
    if (byPeerId.delete(peerId)) fireChange();
  }

  return {
    start() {
      bonjour = (opts.bonjour ?? (() => new Bonjour()))();

      const txt: Record<string, string> = {
        peerId: opts.selfPeerId,
        fp: opts.fingerprint,
        v: '1',
      };
      if (opts.displayName) txt.name = opts.displayName;

      published = bonjour.publish({
        name: `adc-peer-${opts.selfPeerId.slice(0, PEER_ID_SHORT_LEN)}`,
        type: MDNS_SERVICE_TYPE,
        protocol: MDNS_PROTOCOL,
        port: opts.port,
        txt,
      }) as unknown as { stop: () => void };

      browser = bonjour.find({ type: MDNS_SERVICE_TYPE, protocol: MDNS_PROTOCOL });
      browser.on('up', (svc: UpService) => { handleUp(svc); });
      browser.on('down', (svc: UpService) => { handleDown(svc); });
      return Promise.resolve();
    },

    stop() {
      if (browser) {
        try { browser.stop(); } catch { /* ignore */ }
        browser = null;
      }
      if (published) {
        try { published.stop(); } catch { /* ignore */ }
        published = null;
      }
      if (bonjour) {
        try { bonjour.destroy(); } catch { /* ignore */ }
        bonjour = null;
      }
      byPeerId.clear();
      return Promise.resolve();
    },

    getSnapshot() {
      return snapshot();
    },

    onChange(handler) {
      emitter.on('change', handler);
      return () => { emitter.off('change', handler); };
    },
  };
}
