/**
 * Hub connection configuration -- stored locally on each Electron client
 */
export interface HubConnection {
  /** Hub server URL (e.g., "https://192.168.1.100:3443") */
  hubUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Whether the connection is enabled */
  enabled: boolean;
  /** Last successful connection timestamp */
  lastConnected?: string;
  /** Connection status */
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export interface HubConnectionConfig {
  hub: HubConnection | null;
  /** Whether this is the first time setup */
  isFirstRun: boolean;
}
