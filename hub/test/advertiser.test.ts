import test from 'node:test';
import assert from 'node:assert/strict';
import { Bonjour } from 'bonjour-service';
import { createAdvertiser } from '../src/mdns/advertiser.js';

const skipMdns = process.env['SKIP_MDNS_TEST'] === '1';

test(
  'publishes a service with expected TXT fields',
  { skip: skipMdns },
  async () => {
    const adv = createAdvertiser({
      hubId: 'test-hub-1',
      version: '0.2.0',
      channel: 'dev',
      displayName: 'TestHub',
      port: 31337,
      fingerprint: 'a'.repeat(64),
    });
    await adv.start();
    try {
      const bonjour = new Bonjour();
      try {
        const found = await new Promise<{ txt: Record<string, string>; port: number }>(
          (resolve, reject) => {
            let browserRef: ReturnType<typeof bonjour.find> | null = null;
            const timeout = setTimeout(() => {
              browserRef?.stop();
              reject(new Error('timeout waiting for mdns discovery'));
            }, 10_000);
            browserRef = bonjour.find({ type: 'adc-hub' }, (svc) => {
              const txt = svc.txt as Record<string, string> | undefined;
              if (txt?.['id'] === 'test-hub-1') {
                clearTimeout(timeout);
                browserRef?.stop();
                resolve({ txt, port: svc.port });
              }
            });
          },
        );
        assert.equal(found.txt['id'], 'test-hub-1');
        assert.equal(found.txt['v'], '1');
        assert.equal(found.txt['app'], '0.2.0');
        assert.equal(found.txt['ch'], 'dev');
        assert.equal(found.txt['name'], 'TestHub');
        assert.equal(found.txt['api'], '/api');
        assert.equal(found.txt['fp'], 'a'.repeat(64));
        assert.equal(found.port, 31337);
      } finally {
        bonjour.destroy();
      }
    } finally {
      await adv.stop();
    }
  },
);
