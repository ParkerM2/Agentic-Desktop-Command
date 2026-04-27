import { describe, expect, it, expectTypeOf } from 'vitest';

import {
  parseWireFrame,
  type WireFrame,
  type WireFrameSchema,
} from '@main/features/peers/wire-schema';

import type { z } from 'zod';

describe('parseWireFrame', () => {
  it('rejects invalid JSON', () => {
    const result = parseWireFrame('{');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('rejects unknown frame type', () => {
    const result = parseWireFrame(JSON.stringify({ type: 'NOPE' }));
    expect(result.ok).toBe(false);
  });

  it('accepts a fully signed HELLO frame', () => {
    const raw = JSON.stringify({
      type: 'HELLO',
      peerId: 'x',
      schemaHash: 'h',
      nonce: 'n',
      sig: 's',
    });
    const result = parseWireFrame(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.frame.type).toBe('HELLO');
      if (result.frame.type === 'HELLO') {
        expect(result.frame.peerId).toBe('x');
        expect(result.frame.schemaHash).toBe('h');
        expect(result.frame.nonce).toBe('n');
        expect(result.frame.sig).toBe('s');
      }
    }
  });

  it('rejects HELLO missing nonce/sig', () => {
    const raw = JSON.stringify({
      type: 'HELLO',
      peerId: 'x',
      schemaHash: 'h',
    });
    const result = parseWireFrame(raw);
    expect(result.ok).toBe(false);
  });

  it('rejects OPS frame with more than 1000 ops', () => {
    const raw = JSON.stringify({
      type: 'OPS',
      ops: Array.from({ length: 1001 }, () => ({ id: 'x' })),
    });
    const result = parseWireFrame(raw);
    expect(result.ok).toBe(false);
  });

  it('accepts OPS frame at exactly the cap', () => {
    const raw = JSON.stringify({
      type: 'OPS',
      ops: Array.from({ length: 1000 }, () => ({ id: 'x' })),
    });
    const result = parseWireFrame(raw);
    expect(result.ok).toBe(true);
  });

  it('accepts a PING frame', () => {
    const result = parseWireFrame(JSON.stringify({ type: 'PING' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.frame.type).toBe('PING');
    }
  });

  it('exports WireFrame type matching the inferred schema type', () => {
    expectTypeOf<WireFrame>().toEqualTypeOf<z.infer<typeof WireFrameSchema>>();
  });
});
