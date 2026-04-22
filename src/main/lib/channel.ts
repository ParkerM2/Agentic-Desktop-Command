import { CHANNEL_CONFIG, isAppChannel } from '@shared/types/channel';
import type { AppChannel, ChannelConfig } from '@shared/types/channel';

export interface ResolveChannelInput {
  /** Value of process.env.ADC_CHANNEL (if any) */
  envChannel?: string;
  /** True when ADC_DEV_MODE=true */
  devMode?: boolean;
  /** app.isPackaged */
  isPackaged: boolean;
}

/**
 * Pure resolver — no Electron imports — so it is unit-testable.
 * Precedence: explicit env channel > devMode flag > !isPackaged > release.
 */
export function resolveChannel(input: ResolveChannelInput): AppChannel {
  if (input.envChannel && isAppChannel(input.envChannel)) {
    return input.envChannel;
  }
  if (input.devMode || !input.isPackaged) {
    return 'dev';
  }
  return 'release';
}

export function getChannelConfig(channel: AppChannel): ChannelConfig {
  return CHANNEL_CONFIG[channel];
}
