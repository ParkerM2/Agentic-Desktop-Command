import { Bonjour, type Service } from 'bonjour-service';

export interface AdvertiserOpts {
  hubId: string;
  version: string;
  channel: 'release' | 'local' | 'dev';
  displayName: string;
  port: number;
  fingerprint: string;
}

export interface Advertiser {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  refresh: (patch: Partial<AdvertiserOpts>) => Promise<void>;
}

/**
 * Create an mDNS advertiser for this hub.
 *
 * Advertises `_adc-hub._tcp.local` with TXT record:
 *   - id:   hub stable id
 *   - v:    protocol version ("1")
 *   - app:  hub package version
 *   - ch:   channel (release | local | dev)
 *   - name: display name (hostname by default)
 *   - api:  REST API path ("/api")
 *   - fp:   TLS certificate SHA-256 fingerprint (hex)
 *
 * Call `refresh()` after cert rotation to re-advertise with a new fingerprint.
 */
export function createAdvertiser(initial: AdvertiserOpts): Advertiser {
  let bonjour: Bonjour | null = null;
  let service: Service | null = null;
  let current: AdvertiserOpts = { ...initial };

  function publish(): void {
    bonjour ??= new Bonjour();
    service = bonjour.publish({
      name: current.hubId,
      type: 'adc-hub',
      protocol: 'tcp',
      port: current.port,
      txt: {
        id: current.hubId,
        v: '1',
        app: current.version,
        ch: current.channel,
        name: current.displayName,
        api: '/api',
        fp: current.fingerprint,
      },
    });
  }

  async function unpublish(): Promise<void> {
    const existing = service;
    service = null;
    if (existing === null) {
      return;
    }
    await new Promise<void>((resolve) => {
      const stopFn = existing.stop as ((cb: () => void) => void) | undefined;
      if (stopFn === undefined) {
        resolve();
        return;
      }
      stopFn.call(existing, () => {
        resolve();
      });
    });
  }

  return {
    start() {
      publish();
      return Promise.resolve();
    },
    async stop() {
      await unpublish();
      if (bonjour !== null) {
        bonjour.destroy();
        bonjour = null;
      }
    },
    async refresh(patch) {
      current = { ...current, ...patch };
      await unpublish();
      publish();
    },
  };
}
