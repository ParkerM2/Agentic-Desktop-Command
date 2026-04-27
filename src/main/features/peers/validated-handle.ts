import type { z } from 'zod';

/**
 * Centralized handler factory: parses input via the channel's Zod schema,
 * invokes the typed business function, and (in non-production) parses the
 * output to catch service/contract drift early.
 *
 * Audit reference: tmp/audit/04-service-ipc.md H1, H2.
 */

type SchemaMap = Record<string, { input: z.ZodType; output: z.ZodType }>;

export function validatedHandle<M extends SchemaMap, C extends keyof M & string>(
  map: M,
  channel: C,
  fn: (input: z.infer<M[C]['input']>) => Promise<z.infer<M[C]['output']>>,
): (raw: unknown) => Promise<z.infer<M[C]['output']>> {
  const { input, output } = map[channel];
  return async (raw) => {
    const parsedIn = input.parse(raw) as z.infer<M[C]['input']>;
    const result = await fn(parsedIn);
    if (process.env.NODE_ENV !== 'production') {
      output.parse(result);
    }
    return result;
  };
}
