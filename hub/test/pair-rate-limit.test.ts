import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/middleware/pair-rate-limit';

test('allows up to N requests in the window', () => {
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  try {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    assert.deepEqual(limiter.take('ip1'), { allowed: true, remaining: 2 });
    assert.deepEqual(limiter.take('ip1'), { allowed: true, remaining: 1 });
    assert.deepEqual(limiter.take('ip1'), { allowed: true, remaining: 0 });
    const fourth = limiter.take('ip1');
    assert.equal(fourth.allowed, false);
    assert.equal(fourth.remaining, 0);
    assert.equal(typeof fourth.retryAfterMs, 'number');
  } finally {
    mock.timers.reset();
  }
});

test('resets after window elapses', () => {
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  try {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.take('ip1');
    assert.equal(limiter.take('ip1').allowed, false);
    mock.timers.tick(1001);
    assert.equal(limiter.take('ip1').allowed, true);
  } finally {
    mock.timers.reset();
  }
});

test('isolates by key', () => {
  mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  try {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    assert.equal(limiter.take('a').allowed, true);
    assert.equal(limiter.take('b').allowed, true);
    assert.equal(limiter.take('a').allowed, false);
  } finally {
    mock.timers.reset();
  }
});
