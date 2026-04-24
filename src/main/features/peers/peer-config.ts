export interface Phase1PeerConfig {
  /** This peer's listen port. */
  listenPort: number;
  /** Remote peer address to connect to (ws://host:port). Empty string = do not connect. */
  remoteUrl: string;
  /** This peer's short id (8 hex chars). */
  peerIdShort: string;
  /** This peer's full id (64 hex chars). */
  peerIdFull: string;
}

export function loadPhase1PeerConfig(): Phase1PeerConfig {
  const parsedPort = Number(process.env.ADC_PEER_PORT ?? '0');
  return {
    listenPort: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 0,
    remoteUrl: process.env.ADC_PEER_REMOTE ?? '',
    peerIdShort: process.env.ADC_PEER_ID_SHORT ?? 'aaaaaaaa',
    peerIdFull: process.env.ADC_PEER_ID_FULL ?? 'peer-a',
  };
}
