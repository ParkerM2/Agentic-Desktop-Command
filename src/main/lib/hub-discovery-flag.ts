import { ENV_VARS } from '@shared/constants/env';

/**
 * Returns whether the mDNS hub-discovery + network-watcher subsystem
 * should start at boot.
 *
 * Default: true. The emergency rollback is to set
 * `ENABLE_HUB_DISCOVERY=false` (literal string) — any other value keeps
 * discovery enabled so the happy path survives typos and unrelated
 * env noise.
 *
 * When disabled, the legacy `HUB.CONNECT.SERVER` URL+key flow still
 * works for users who want the old manual setup.
 */
export function shouldEnableDiscovery(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[ENV_VARS.ENABLE_HUB_DISCOVERY] !== 'false';
}
