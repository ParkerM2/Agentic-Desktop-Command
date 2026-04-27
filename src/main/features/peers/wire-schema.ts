import { z } from 'zod';

/**
 * Wire-level schema for peer-to-peer WebSocket frames.
 *
 * Frames are JSON-encoded and parsed at a hostile trust boundary —
 * any field a peer sends MUST be Zod-validated before use. `parseWireFrame`
 * is the single entry point; on failure callers close the socket with
 * WS code 4003 ('malformed frame'). See audit `tmp/audit/02-transport.md` H1.
 */

export const HelloFrameSchema = z.object({
  type: z.literal('HELLO'),
  peerId: z.string().min(1).max(128),
  schemaHash: z.string().min(1).max(128),
  nonce: z.string().min(1).max(256),
  sig: z.string().min(1).max(256),
});

export const OpsFrameSchema = z.object({
  type: z.literal('OPS'),
  ops: z.array(z.unknown()).max(1000),
});

export const PingFrameSchema = z.object({
  type: z.literal('PING'),
});

export const WireFrameSchema = z.discriminatedUnion('type', [
  HelloFrameSchema,
  OpsFrameSchema,
  PingFrameSchema,
]);

export type HelloFrame = z.infer<typeof HelloFrameSchema>;
export type OpsFrame = z.infer<typeof OpsFrameSchema>;
export type PingFrame = z.infer<typeof PingFrameSchema>;
export type WireFrame = z.infer<typeof WireFrameSchema>;

/**
 * Parse and validate a raw WS frame. Returns a discriminated result so callers
 * can distinguish JSON errors from schema errors and log the reason without
 * leaking attacker-controlled content into structured logs.
 */
export function parseWireFrame(
  raw: string,
):
  | { ok: true; frame: WireFrame }
  | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid json' };
  }
  const result = WireFrameSchema.safeParse(json);
  if (result.success) {
    return { ok: true, frame: result.data };
  }
  return { ok: false, error: result.error.message };
}
