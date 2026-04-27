import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validatedHandle } from '@main/features/peers/validated-handle';

const map = {
  'test.echo': {
    input: z.object({ name: z.string() }),
    output: z.object({ greeting: z.string() }),
  },
  'test.bad': {
    input: z.object({}).optional(),
    output: z.object({ value: z.number() }),
  },
} as const;

describe('validatedHandle', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('parses input via Zod and rejects bad input', async () => {
    const handler = validatedHandle(map, 'test.echo', (input) =>
      Promise.resolve({ greeting: `hello ${input.name}` }),
    );
    await expect(handler({ wrong: 'shape' })).rejects.toThrow();
  });

  it('returns typed result on happy path', async () => {
    const handler = validatedHandle(map, 'test.echo', (input) =>
      Promise.resolve({ greeting: `hello ${input.name}` }),
    );
    const result = await handler({ name: 'world' });
    expect(result).toEqual({ greeting: 'hello world' });
  });

  it('throws when output schema fails in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const handler = validatedHandle(
      map,
      'test.bad',
      // intentionally bad: output schema expects { value: number }
      () => Promise.resolve({ value: 'not-a-number' as unknown as number }),
    );
    await expect(handler({})).rejects.toThrow();
  });

  it('does NOT validate output in production', async () => {
    process.env.NODE_ENV = 'production';
    const handler = validatedHandle(
      map,
      'test.bad',
      () => Promise.resolve({ value: 'not-a-number' as unknown as number }),
    );
    // Output validation skipped — bad value flows through
    const result = await handler({});
    expect(result).toEqual({ value: 'not-a-number' });
  });

  it('returns a function with shape (raw: unknown) => Promise<output>', async () => {
    const handler = validatedHandle(map, 'test.echo', (input) =>
      Promise.resolve({ greeting: `hi ${input.name}` }),
    );
    const promise = handler({ name: 'x' });
    expect(promise).toBeInstanceOf(Promise);
    expect(await promise).toEqual({ greeting: 'hi x' });
  });
});
