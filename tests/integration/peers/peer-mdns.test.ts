import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PeerAdvertisement } from '@main/features/peers/peer-mdns';
import { createPeerMdns } from '@main/features/peers/peer-mdns';

import type { Bonjour } from 'bonjour-service';

class FakeBrowser extends EventEmitter {
  start(): void { /* no-op for tests */ }
  stop(): void { this.removeAllListeners(); }
}

class FakeBonjour {
  public publishedServices: Array<{ name: string; type: string; port: number; txt: Record<string, string> }> = [];
  public activeBrowsers: FakeBrowser[] = [];
  publish(opts: { name: string; type: string; port: number; txt: Record<string, string> }) {
    this.publishedServices.push(opts);
    return { stop: vi.fn() };
  }
  find(_filter: { type: string; protocol: string }) {
    const browser = new FakeBrowser();
    this.activeBrowsers.push(browser);
    return browser;
  }
  destroy() { /* no-op */ }
}

let fake: FakeBonjour;

beforeEach(() => { fake = new FakeBonjour(); });
afterEach(() => { vi.restoreAllMocks(); });

function makeMdns(selfPeerId = 'self-peer-id-full-64chars'.padEnd(64, 'x')) {
  return createPeerMdns({
    selfPeerId,
    fingerprint: 'a'.repeat(64),
    port: 7700,
    displayName: 'Test Peer',
    bonjour: () => fake as unknown as Bonjour,
  });
}

describe('peer-mdns', () => {
  it('publishes service on start() with expected TXT', async () => {
    const m = makeMdns();
    await m.start();
    expect(fake.publishedServices).toHaveLength(1);
    const svc = fake.publishedServices[0];
    expect(svc.type).toBe('adc-peer');
    expect(svc.port).toBe(7700);
    expect(svc.txt.peerId).toMatch(/^self-peer-id/);
    expect(svc.txt.fp).toBe('a'.repeat(64));
    await m.stop();
  });

  it('collects discovered peers', async () => {
    const m = makeMdns();
    await m.start();
    const browser = fake.activeBrowsers[0];

    browser.emit('up', {
      name: 'other-peer-abc',
      port: 7701,
      addresses: ['192.168.1.5'],
      txt: { peerId: 'b'.repeat(64), fp: 'c'.repeat(64), name: 'Other Device', v: '1' },
    });

    const snapshot = m.getSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].peerId).toBe('b'.repeat(64));
    expect(snapshot[0].host).toBe('192.168.1.5');
    expect(snapshot[0].port).toBe(7701);
    expect(snapshot[0].fingerprint).toBe('c'.repeat(64));
    expect(snapshot[0].displayName).toBe('Other Device');

    await m.stop();
  });

  it('filters out our own advertisement by peerId', async () => {
    const self = 's'.repeat(64);
    const m = makeMdns(self);
    await m.start();
    const browser = fake.activeBrowsers[0];

    browser.emit('up', {
      name: 'self-advertisement',
      port: 7700,
      addresses: ['127.0.0.1'],
      txt: { peerId: self, fp: 'a'.repeat(64), v: '1' },
    });

    expect(m.getSnapshot()).toHaveLength(0);
    await m.stop();
  });

  it('emits change events on up + down', async () => {
    const m = makeMdns();
    await m.start();
    const events: PeerAdvertisement[][] = [];
    const unsub = m.onChange((peers) => events.push(peers));

    const browser = fake.activeBrowsers[0];
    browser.emit('up', {
      name: 'p',
      port: 7701,
      addresses: ['10.0.0.5'],
      txt: { peerId: 'b'.repeat(64), fp: 'c'.repeat(64), v: '1' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toHaveLength(1);

    browser.emit('down', {
      name: 'p',
      port: 7701,
      txt: { peerId: 'b'.repeat(64), fp: 'c'.repeat(64), v: '1' },
    });
    expect(events).toHaveLength(2);
    expect(events[1]).toHaveLength(0);

    unsub();
    await m.stop();
  });
});
