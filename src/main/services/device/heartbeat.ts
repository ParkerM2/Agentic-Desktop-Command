/**
 * Heartbeat Service — Sends periodic heartbeat pings to Hub
 *
 * Starts a timer that calls deviceService.sendHeartbeat() at a configurable
 * interval (default 30 seconds). Handles errors gracefully without crashing.
 */

import type { DeviceService } from './device-service';

const DEFAULT_INTERVAL_MS = 30_000;

export interface HeartbeatService {
  start: (deviceId: string) => void;
  stop: () => void;
}

export function createHeartbeatService(deps: {
  deviceService: DeviceService;
  intervalMs?: number;
}): HeartbeatService {
  const { deviceService, intervalMs = DEFAULT_INTERVAL_MS } = deps;
  let timer: ReturnType<typeof setInterval> | null = null;
  let currentDeviceId: string | null = null;

  function tick(): void {
    if (!currentDeviceId) return;

    deviceService.sendHeartbeat(currentDeviceId).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[HeartbeatService] Heartbeat failed:', message);
    });
  }

  return {
    start(deviceId) {
      // Stop any existing timer first
      if (timer !== null) {
        clearInterval(timer);
      }

      currentDeviceId = deviceId;
      timer = setInterval(tick, intervalMs);

      console.log(
        `[HeartbeatService] Started heartbeat for device ${deviceId} (interval: ${String(intervalMs)}ms)`,
      );
    },

    stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      currentDeviceId = null;

      console.log('[HeartbeatService] Stopped');
    },
  };
}
