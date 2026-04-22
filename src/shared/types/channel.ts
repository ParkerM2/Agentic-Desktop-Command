export const APP_CHANNELS = ['release', 'local', 'dev'] as const;
export type AppChannel = (typeof APP_CHANNELS)[number];

export interface ChannelConfig {
  /** Electron app name — drives %APPDATA%/<name>/, cache, logs, crashDumps */
  readonly name: string;
  /** Windows AppUserModelID — drives taskbar grouping and toast routing */
  readonly aumid: string;
  /** Human-readable label for window title and UI badges */
  readonly label: string;
}

export const CHANNEL_CONFIG: Record<AppChannel, ChannelConfig> = {
  release: { name: 'ADC',       aumid: 'com.adc.app',       label: 'ADC' },
  local:   { name: 'ADC-Local', aumid: 'com.adc.app.local', label: 'ADC (Local Build)' },
  dev:     { name: 'ADC-Dev',   aumid: 'com.adc.app.dev',   label: 'ADC (Dev)' },
};

export function isAppChannel(value: unknown): value is AppChannel {
  return typeof value === 'string' && (APP_CHANNELS as readonly string[]).includes(value);
}
