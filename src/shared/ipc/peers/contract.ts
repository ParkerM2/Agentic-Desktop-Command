import { z } from 'zod';

import { PEERS, PEERS_EVENTS } from './channels';

// Naming convention: `certFingerprint` is the persisted DB column on paired
// peers (matches src/main/features/peers/peer-store.ts); `fingerprint` is the
// wire/transient form used in mDNS TXT records, TLS APIs, and pair inputs.
// Both refer to the same lowercase-hex SHA-256 of the DER cert.

export const PairedPeerSchema = z.object({
  peerId: z.string(),
  displayName: z.string().nullable(),
  pubkey: z.string(),
  certFingerprint: z.string(),
  lastSeenHlc: z.string().nullable(),
  pairedAt: z.number(),
  lastConnectedAt: z.number().nullable(),
  revokedAt: z.number().nullable(),
});
export type PairedPeer = z.infer<typeof PairedPeerSchema>;

export const DiscoveredPeerSchema = z.object({
  peerId: z.string(),
  fingerprint: z.string(),
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  displayName: z.string().nullable().optional(),
  lastSeenAt: z.number(),
  isPaired: z.boolean(),
});
export type DiscoveredPeer = z.infer<typeof DiscoveredPeerSchema>;

export const SelfIdentitySchema = z.object({
  peerId: z.string(),
  pubkey: z.string(),
  fingerprint: z.string(),
  displayName: z.string().nullable(),
});
export type SelfIdentity = z.infer<typeof SelfIdentitySchema>;

export const PairInitInputSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  fingerprint: z.string(),
  displayName: z.string().nullable().optional(),
});
export type PairInitInput = z.infer<typeof PairInitInputSchema>;

export const PairInitOutputSchema = z.object({
  sessionId: z.string(),
  challenge: z.string(),
});
export type PairInitOutput = z.infer<typeof PairInitOutputSchema>;

export const PairConfirmInputSchema = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  fingerprint: z.string(),
  sessionId: z.string(),
  challenge: z.string(),
  pin: z.string().regex(/^\d{6}$/),
  displayName: z.string().nullable().optional(),
});
export type PairConfirmInput = z.infer<typeof PairConfirmInputSchema>;

export const PairConfirmOutputSchema = z.object({
  peerId: z.string(),
  pubkey: z.string(),
  fingerprint: z.string(),
});
export type PairConfirmOutput = z.infer<typeof PairConfirmOutputSchema>;

export const RevokeInputSchema = z.object({ peerId: z.string() });
export type RevokeInput = z.infer<typeof RevokeInputSchema>;
export const RevokeOutputSchema = z.object({ revoked: z.boolean() });
export type RevokeOutput = z.infer<typeof RevokeOutputSchema>;

export const PinIssuedEventSchema = z.object({
  sessionId: z.string(),
  pin: z.string(),
  initiatorPeerId: z.string(),
  initiatorDisplayName: z.string().nullable().optional(),
  issuedAt: z.number(),
});
export type PinIssuedEvent = z.infer<typeof PinIssuedEventSchema>;

export const DiscoveryChangedEventSchema = z.object({
  peers: z.array(DiscoveredPeerSchema),
});
export type DiscoveryChangedEvent = z.infer<typeof DiscoveryChangedEventSchema>;

export const TrustChangedEventSchema = z.object({
  peerId: z.string(),
  action: z.enum(['added', 'revoked', 'updated']),
});
export type TrustChangedEvent = z.infer<typeof TrustChangedEventSchema>;

export const peersInvoke = {
  [PEERS.LIST.PAIRED]: {
    input: z.object({}).optional(),
    output: z.array(PairedPeerSchema),
  },
  [PEERS.LIST.DISCOVERED]: {
    input: z.object({}).optional(),
    output: z.array(DiscoveredPeerSchema),
  },
  [PEERS.IDENTITY.GET]: {
    input: z.object({}).optional(),
    output: SelfIdentitySchema,
  },
  [PEERS.PAIR.INIT]: {
    input: PairInitInputSchema,
    output: PairInitOutputSchema,
  },
  [PEERS.PAIR.CONFIRM]: {
    input: PairConfirmInputSchema,
    output: PairConfirmOutputSchema,
  },
  [PEERS.REVOKE.PEER]: {
    input: RevokeInputSchema,
    output: RevokeOutputSchema,
  },
} as const;

export const peersEvents = {
  [PEERS_EVENTS.PIN.ISSUED]: {
    payload: PinIssuedEventSchema,
  },
  [PEERS_EVENTS.DISCOVERY.CHANGED]: {
    payload: DiscoveryChangedEventSchema,
  },
  [PEERS_EVENTS.TRUST.CHANGED]: {
    payload: TrustChangedEventSchema,
  },
} as const;
