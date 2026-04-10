/**
 * Unit Tests for lazyService
 *
 * Tests the Proxy-based lazy initialization utility:
 * - Factory is deferred until first property access
 * - Memoization: factory is called at most once on success
 * - Error propagation: factory errors surface to the caller
 * - Error retry: a failing factory is retried on next access (not cached)
 * - `in` operator triggers initialization via the `has` trap
 * - TypeScript type inference (validated via compile-time checks)
 */

import { describe, expect, it, vi } from 'vitest';

import { lazyService } from '@main/lib/lazy-service';

// ── Helpers ──────────────────────────────────────────────────────────

interface FooService {
  name: string;
  greet: () => string;
  value: number;
}

function makeFooFactory(overrides?: Partial<FooService>): () => FooService {
  return () => ({
    name: 'foo',
    greet: () => 'hello',
    value: 42,
    ...overrides,
  });
}

// ── Tests ────────────────────────────────────────────────────────────

describe('lazyService', () => {
  // ── Lazy initialization ─────────────────────────────────────────

  describe('lazy initialization', () => {
    it('does NOT call the factory before any property access', () => {
      const factory = vi.fn(makeFooFactory());

      lazyService(factory);

      expect(factory).not.toHaveBeenCalled();
    });

    it('calls the factory on first property access', () => {
      const factory = vi.fn(makeFooFactory());
      const proxy = lazyService(factory);

      // Access any property to trigger initialization
      const _ = proxy.name;

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('returns the correct value from the underlying service', () => {
      const proxy = lazyService(makeFooFactory());

      expect(proxy.name).toBe('foo');
      expect(proxy.value).toBe(42);
    });

    it('returns correct method results from the underlying service', () => {
      const proxy = lazyService(makeFooFactory());

      expect(proxy.greet()).toBe('hello');
    });
  });

  // ── Memoization ─────────────────────────────────────────────────

  describe('memoization', () => {
    it('calls the factory exactly once for multiple property accesses', () => {
      const factory = vi.fn(makeFooFactory());
      const proxy = lazyService(factory);

      // Multiple accesses — void each to trigger initialization without storing results
      void proxy.name;
      void proxy.value;
      void proxy.greet();
      void proxy.name;

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('returns the same instance on repeated accesses', () => {
      let callCount = 0;
      const uniqueObject = { id: 'unique-instance', data: 'state' };
      const factory = () => {
        callCount++;
        return uniqueObject;
      };
      const proxy = lazyService(factory);

      const firstAccess = proxy.id;
      const secondAccess = proxy.id;

      expect(firstAccess).toBe(secondAccess);
      expect(callCount).toBe(1);
    });

    it('reflects live state changes on the underlying instance', () => {
      let counter = 0;
      const service = {
        get count() {
          return counter;
        },
        increment() {
          counter++;
        },
      };
      const proxy = lazyService(() => service);

      proxy.increment();
      proxy.increment();

      expect(proxy.count).toBe(2);
    });
  });

  // ── Error propagation ───────────────────────────────────────────

  describe('error propagation', () => {
    it('propagates factory errors to the caller', () => {
      const factory = (): FooService => {
        throw new Error('Factory failed');
      };
      const proxy = lazyService(factory);

      expect(() => proxy.name).toThrow('Factory failed');
    });

    it('propagates factory errors as the original Error instance', () => {
      const originalError = new TypeError('Type mismatch');
      const proxy = lazyService<FooService>(() => {
        throw originalError;
      });

      let caught: unknown;
      try {
        const _ = proxy.name;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBe(originalError);
    });
  });

  // ── Error retry (do not cache errors) ───────────────────────────

  describe('error retry', () => {
    it('retries the factory after a failed initialization', () => {
      let attempt = 0;
      const factory = vi.fn(() => {
        attempt++;
        if (attempt === 1) {
          throw new Error('First attempt failed');
        }
        return { name: 'recovered', greet: () => 'hi', value: 1 };
      });
      const proxy = lazyService(factory);

      // First access throws
      expect(() => proxy.name).toThrow('First attempt failed');
      expect(factory).toHaveBeenCalledTimes(1);

      // Second access succeeds (factory retried)
      expect(proxy.name).toBe('recovered');
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('memoizes after a successful retry', () => {
      let attempt = 0;
      const factory = vi.fn(() => {
        attempt++;
        if (attempt === 1) throw new Error('fail');
        return { name: 'ok', greet: () => 'ok', value: 0 };
      });
      const proxy = lazyService(factory);

      // First access fails
      expect(() => proxy.name).toThrow();

      // Second and third accesses succeed and reuse the same instance
      void proxy.name;
      void proxy.name;

      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  // ── `has` trap ───────────────────────────────────────────────────

  describe('has trap', () => {
    it('triggers initialization when using the `in` operator', () => {
      const factory = vi.fn(makeFooFactory());
      const proxy = lazyService(factory);

      const result = 'name' in proxy;

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('returns false for properties not on the underlying service', () => {
      const proxy = lazyService(makeFooFactory());

      expect('nonExistentProp' in proxy).toBe(false);
    });

    it('does not double-initialize when `in` is followed by property access', () => {
      const factory = vi.fn(makeFooFactory());
      const proxy = lazyService(factory);

      const _has = 'name' in proxy;
      const _val = proxy.name;

      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  // ── Type inference ───────────────────────────────────────────────

  describe('type inference', () => {
    it('infers the return type from the factory', () => {
      // TypeScript compile-time check: proxy should be typed as FooService
      const proxy: FooService = lazyService<FooService>(makeFooFactory());

      // Runtime check to confirm the type contract holds
      expect(typeof proxy.name).toBe('string');
      expect(typeof proxy.greet).toBe('function');
      expect(typeof proxy.value).toBe('number');
    });

    it('works with complex nested object types', () => {
      interface DeepService {
        config: { timeout: number; retries: number };
        run: (input: string) => Promise<string>;
      }

      const factory = (): DeepService => ({
        config: { timeout: 5000, retries: 3 },
        run: (input: string) => Promise.resolve(`result: ${input}`),
      });

      const proxy = lazyService(factory);

      expect(proxy.config.timeout).toBe(5000);
      expect(proxy.config.retries).toBe(3);
    });
  });
});
