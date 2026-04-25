export interface PeerConfig {
  /** This peer's listen port. */
  listenPort: number;
  /** Remote peer address to connect to (ws:// or wss://host:port). Empty = no manual override. */
  remoteUrl: string;
  /** This peer's short id (8 hex chars). Empty when identity-derived at boot. */
  peerIdShort: string;
  /** This peer's full id (64 hex chars). Empty when identity-derived at boot. */
  peerIdFull: string;
  /** When true, advertise + browse over mDNS. Default true. */
  preferMdns: boolean;
  /** When true, expose /pair/* endpoints. Default true. */
  pairingEnabled: boolean;
  /** Optional human-readable name for mDNS TXT records. */
  displayName?: string;
}

/**
 * @deprecated Use {@link PeerConfig} — kept as a type alias for back-compat.
 */
export type Phase1PeerConfig = PeerConfig;

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === '1' || value.toLowerCase() === 'true') return true;
  if (value === '0' || value.toLowerCase() === 'false') return false;
  return fallback;
}

export function loadPeerConfig(): PeerConfig {
  const parsedPort = Number(process.env.ADC_PEER_PORT ?? '0');
  return {
    listenPort: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 0,
    remoteUrl: process.env.ADC_PEER_REMOTE ?? '',
    peerIdShort: process.env.ADC_PEER_ID_SHORT ?? '',
    peerIdFull: process.env.ADC_PEER_ID_FULL ?? '',
    preferMdns: parseBool(process.env.ADC_PEER_PREFER_MDNS, true),
    pairingEnabled: parseBool(process.env.ADC_PEER_PAIRING_ENABLED, true),
    displayName: process.env.ADC_PEER_DISPLAY_NAME,
  };
}

/**
 * @deprecated Use {@link loadPeerConfig}.
 */
export function loadPhase1PeerConfig(): PeerConfig {
  return loadPeerConfig();
}
