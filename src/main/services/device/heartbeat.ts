/**
 * Heartbeat Service — Sends periodic heartbeat pings to Hub
 *
 * Starts a timer that calls deviceService.sendHeartbeat() at a configurable
 * interval (default 30 seconds). Includes local project list with each ping.
 * Handles errors gracefully without crashing.
 */

import { serviceLogger } from '@main/lib/logger';

import type { DeviceService } from './device-service';

// Minimal project shape needed by heartbeat — avoids coupling to full ProjectService
export interface HeartbeatProjectSource {
  listProjectsSync: () => Array<{ id: string; name: string; path: string }>;
}

const DEFAULT_INTERVAL_MS = 30_000;

export interface HeartbeatService {
  start: (deviceId: string) => void;
  stop: () => void;
}

export function createHeartbeatService(deps: {
  deviceService: DeviceService;
  projectSource?: HeartbeatProjectSource;
  intervalMs?: number;
}): HeartbeatService {
  const { deviceService, projectSource, intervalMs = DEFAULT_INTERVAL_MS } = deps;
  let timer: ReturnType<typeof setInterval> | null = null;
  let currentDeviceId: string | null = null;

  function tick(): void {
    if (!currentDeviceId) return;

    const projects = projectSource
      ? projectSource.listProjectsSync().map((p) => ({
          id: p.id,
          name: p.name,
          path: p.path,
        }))
      : undefined;

    deviceService.sendHeartbeat(currentDeviceId, projects).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      serviceLogger.warn('[HeartbeatService] Heartbeat failed:', message);
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

      serviceLogger.info(
        `[HeartbeatService] Started heartbeat for device ${deviceId} (interval: ${String(intervalMs)}ms)`,
      );
    },

    stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      currentDeviceId = null;

      serviceLogger.info('[HeartbeatService] Stopped');
    },
  };
}
