import { describe, expect, it, vi } from 'vitest';

import { safeFanOut } from '@main/features/peers/peers-service';
import { serviceLogger } from '@main/lib/logger';

describe('safeFanOut', () => {
  it('calls every handler even when one throws', () => {
    const a = vi.fn();
    const b = vi.fn(() => {
      throw new Error('boom');
    });
    const c = vi.fn();
    const handlers = new Set<(v: number) => void>([a, b, c]);

    const warnSpy = vi.spyOn(serviceLogger, 'warn').mockImplementation(() => { /* swallow */ });

    expect(() => { safeFanOut(handlers, 7, 'testEvent'); }).not.toThrow();

    expect(a).toHaveBeenCalledWith(7);
    expect(b).toHaveBeenCalledWith(7);
    expect(c).toHaveBeenCalledWith(7);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // Logger warn signature: (obj, msg)
    const [obj, msg] = warnSpy.mock.calls[0] as [{ err: unknown }, string];
    expect((obj.err as Error).message).toBe('boom');
    expect(msg).toContain('testEvent');

    warnSpy.mockRestore();
  });

  it('is a no-op for an empty Set', () => {
    const warnSpy = vi.spyOn(serviceLogger, 'warn').mockImplementation(() => { /* swallow */ });
    const empty = new Set<(v: string) => void>();
    expect(() => { safeFanOut(empty, 'x', 'noopEvent'); }).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
