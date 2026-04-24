import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { createNonceStore } from '../src/lib/nonce-store.js';

test('mint returns 43-char base64url + expiresAt 30s from now', () => {
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  try {
    const store = createNonceStore();
    const { nonce, expiresAt } = store.mint('c1');
    assert.match(nonce, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(expiresAt, 1_000_000 + 30_000);
  } finally {
    mock.timers.reset();
  }
});

test('has returns true until expiry, false after', () => {
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  try {
    const store = createNonceStore();
    const { nonce } = store.mint('c1');
    assert.equal(store.has('c1', nonce), true);
    mock.timers.tick(29_000);
    assert.equal(store.has('c1', nonce), true);
    mock.timers.tick(2_000);
    assert.equal(store.has('c1', nonce), false);
  } finally {
    mock.timers.reset();
  }
});

test('consume returns true once then false', () => {
  const store = createNonceStore();
  const { nonce } = store.mint('c1');
  assert.equal(store.consume('c1', nonce), true);
  assert.equal(store.consume('c1', nonce), false);
});

test('nonces are isolated per clientId', () => {
  const store = createNonceStore();
  const { nonce: n1 } = store.mint('c1');
  assert.equal(store.has('c2', n1), false);
});
