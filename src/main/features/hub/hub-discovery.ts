import { EventEmitter } from 'node:events';

import { Bonjour, type Service } from 'bonjour-service';

export interface DiscoveredHub {
  hubId: string;
  displayName: string;
  version: string;
  channel: string;
  addresses: string[];
  port: number;
  fingerprint: string;
  lastSeenAt: string; // ISO
  stale: boolean;
}

export interface HubDiscoveryOpts {
  /** Channel the client is in — only hubs with matching `ch` TXT are surfaced. */
  channel: string;
  /** Override the bonjour factory for testing. */
  bonjour?: () => Bonjour;
  /** Override Date.now for testing. */
  now?: () => number;
  /** Override debounce timer for testing. */
  debounceMs?: number;
  /** Override stale threshold ms. */
  staleMs?: number;
  /** Override drop threshold ms. */
  dropMs?: number;
}

export interface HubDiscovery {
  start: () => void;
  stop: () => Promise<void>;
  getSnapshot: () => DiscoveredHub[];
  clear: () => void;
  on: (event: 'changed', handler: (hubs: DiscoveredHub[]) => void) => () => void;
}

const DEFAULT_DEBOUNCE_MS = 250;
const DEFAULT_STALE_MS = 60_000;
const DEFAULT_DROP_MS = 5 * 60_000;

export function createHubDiscovery(opts: HubDiscoveryOpts): HubDiscovery {
  const emitter = new EventEmitter();
  const byHubId = new Map<string, DiscoveredHub>();

  const now = opts.now ?? Date.now;
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
  const dropMs = opts.dropMs ?? DEFAULT_DROP_MS;

  let bonjour: Bonjour | null = null;
  let browser: ReturnType<Bonjour['find']> | null = null;
  let sweepTimer: NodeJS.Timeout | null = null;
  let debounceTimer: NodeJS.Timeout | null = null;

  function snapshot(): DiscoveredHub[] {
    return [...byHubId.values()];
  }

  function scheduleEmit(): void {
    if (debounceTimer !== null) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      emitter.emit('changed', snapshot());
    }, debounceMs);
    debounceTimer.unref();
  }

  function upsertFromService(svc: Service): void {
    const txt = (svc.txt ?? {}) as Record<string, string | undefined>;
    const hubId = txt.id;
    if (hubId === undefined || hubId === '') return;
    if (txt.ch !== opts.channel) return; // channel filter
    const ts = new Date(now()).toISOString();
    const next: DiscoveredHub = {
      hubId,
      displayName: txt.name ?? hubId,
      version: txt.app ?? '',
      channel: txt.ch,
      addresses: Array.isArray(svc.addresses) ? [...svc.addresses] : [],
      port: svc.port,
      fingerprint: txt.fp ?? '',
      lastSeenAt: ts,
      stale: false,
    };
    const prev = byHubId.get(hubId);
    if (prev !== undefined && sameHub(prev, next)) return;
    byHubId.set(hubId, next);
    scheduleEmit();
  }

  function sameHub(a: DiscoveredHub, b: DiscoveredHub): boolean {
    return (
      a.hubId === b.hubId &&
      a.displayName === b.displayName &&
      a.version === b.version &&
      a.channel === b.channel &&
      a.port === b.port &&
      a.fingerprint === b.fingerprint &&
      a.stale === b.stale &&
      a.addresses.length === b.addresses.length &&
      a.addresses.every((addr, i) => addr === b.addresses[i])
    );
  }

  function sweep(): void {
    const t = now();
    let changed = false;
    for (const [id, hub] of byHubId) {
      const age = t - Date.parse(hub.lastSeenAt);
      if (age >= dropMs) {
        byHubId.delete(id);
        changed = true;
      } else if (age >= staleMs && !hub.stale) {
        byHubId.set(id, { ...hub, stale: true });
        changed = true;
      }
    }
    if (changed) scheduleEmit();
  }

  return {
    start() {
      if (bonjour !== null) return;
      bonjour = opts.bonjour ? opts.bonjour() : new Bonjour();
      browser = bonjour.find({ type: 'adc-hub', protocol: 'tcp' });
      browser.on('up', upsertFromService);
      browser.on('down', (svc: Service) => {
        const txt = (svc.txt ?? {}) as Record<string, string | undefined>;
        const hubId = txt.id;
        if (hubId !== undefined && byHubId.delete(hubId)) scheduleEmit();
      });
      sweepTimer = setInterval(sweep, Math.min(staleMs, 10_000));
      sweepTimer.unref();
    },
    async stop() {
      if (sweepTimer !== null) {
        clearInterval(sweepTimer);
        sweepTimer = null;
      }
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (browser !== null) {
        browser.stop();
        browser = null;
      }
      if (bonjour !== null) {
        const b = bonjour;
        bonjour = null;
        await new Promise<void>((resolve) => {
          b.destroy();
          resolve();
        });
      }
      byHubId.clear();
    },
    getSnapshot: snapshot,
    clear() {
      const had = byHubId.size > 0;
      byHubId.clear();
      if (had) scheduleEmit();
    },
    on(event, handler) {
      emitter.on(event, handler);
      return () => {
        emitter.off(event, handler);
      };
    },
  };
}
