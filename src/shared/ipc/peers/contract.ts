import { z } from 'zod';

export const PairedPeerSchema = z.object({
  peerId: z.string(),
  displayName: z.string().nullable(),
  pubkey: z.string(),
  certFingerprint: z.string(),
  pairedAt: z.number(),
  lastConnectedAt: z.number().nullable(),
  revokedAt: z.number().nullable(),
});
export type PairedPeer = z.infer<typeof PairedPeerSchema>;

export const DiscoveredPeerSchema = z.object({
  peerId: z.string(),
  fingerprint: z.string(),
  host: z.string(),
  port: z.number(),
  displayName: z.string().optional(),
  lastSeenAt: z.number(),
  isPaired: z.boolean(),
});
export type DiscoveredPeer = z.infer<typeof DiscoveredPeerSchema>;

export const SelfIdentitySchema = z.object({
  peerId: z.string(),
  pubkey: z.string(),
  fingerprint: z.string(),
  displayName: z.string().optional(),
});
export type SelfIdentity = z.infer<typeof SelfIdentitySchema>;

export const PairInitInputSchema = z.object({
  host: z.string(),
  port: z.number(),
  fingerprint: z.string(),
  displayName: z.string().optional(),
});
export type PairInitInput = z.infer<typeof PairInitInputSchema>;

export const PairInitOutputSchema = z.object({
  sessionId: z.string(),
  challenge: z.string(),
});
export type PairInitOutput = z.infer<typeof PairInitOutputSchema>;

export const PairConfirmInputSchema = z.object({
  host: z.string(),
  port: z.number(),
  fingerprint: z.string(),
  sessionId: z.string(),
  challenge: z.string(),
  pin: z.string().regex(/^\d{6}$/),
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
  initiatorDisplayName: z.string().optional(),
  issuedAt: z.number(),
});
export type PinIssuedEvent = z.infer<typeof PinIssuedEventSchema>;

export const DiscoveryChangedEventSchema = z.object({
  peers: z.array(DiscoveredPeerSchema),
});
export type DiscoveryChangedEvent = z.infer<typeof DiscoveryChangedEventSchema>;

export const TrustChangedEventSchema = z.object({
  peers: z.array(PairedPeerSchema),
});
export type TrustChangedEvent = z.infer<typeof TrustChangedEventSchema>;
