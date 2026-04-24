export const ENV_VARS = {
  ADC_DEV_MODE: 'ADC_DEV_MODE',
  ADC_DEV_EMAIL: 'ADC_DEV_EMAIL',
  ADC_DEV_PASSWORD: 'ADC_DEV_PASSWORD',
  ADC_CONFIG_FILE: 'ADC_CONFIG_FILE',
  ADC_CHANNEL: 'ADC_CHANNEL',
  /**
   * Emergency rollback lever for the mDNS hub-discovery + network-watcher
   * flow. Defaults to enabled; set explicitly to `'false'` to skip starting
   * discovery and keep the legacy URL+key HUB.CONNECT.SERVER flow functional.
   */
  ENABLE_HUB_DISCOVERY: 'ENABLE_HUB_DISCOVERY',
} as const;

export const APP_INFO_BRIDGE = 'appInfo' as const;
