/**
 * Device Service — Manages device registration and status via Hub API
 *
 * All methods are async since they proxy to the Hub REST API.
 */

import type { Device, DeviceCapabilities } from '@shared/types';
import type { DeviceType } from '@shared/types/hub-protocol';

import type { HubApiClient } from '../hub/hub-api-client';

// ─── Types ───────────────────────────────────────────────────

export interface DeviceRegisterInput {
  machineId: string;
  deviceName: string;
  deviceType: DeviceType;
  capabilities: DeviceCapabilities;
  appVersion: string;
}

export interface DeviceUpdateInput {
  deviceName?: string;
  capabilities?: DeviceCapabilities;
  isOnline?: boolean;
  appVersion?: string;
}

export interface DeviceService {
  registerDevice: (input: DeviceRegisterInput) => Promise<Device>;
  getDevices: () => Promise<Device[]>;
  updateDevice: (id: string, updates: DeviceUpdateInput) => Promise<Device>;
  sendHeartbeat: (deviceId: string) => Promise<{ success: boolean; lastSeen: string }>;
}

// ─── Factory ─────────────────────────────────────────────────

export function createDeviceService(deps: {
  hubApiClient: HubApiClient;
}): DeviceService {
  const { hubApiClient } = deps;

  return {
    async registerDevice(input) {
      const result = await hubApiClient.registerDevice({
        machineId: input.machineId,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        capabilities: input.capabilities,
        appVersion: input.appVersion,
      });

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? 'Failed to register device');
      }

      return result.data;
    },

    async getDevices() {
      const result = await hubApiClient.hubGet<{ devices: Device[] }>('/api/devices');

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? 'Failed to fetch devices');
      }

      return result.data.devices;
    },

    async updateDevice(id, updates) {
      const result = await hubApiClient.hubPatch<Device>(
        `/api/devices/${encodeURIComponent(id)}`,
        updates,
      );

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? `Failed to update device ${id}`);
      }

      return result.data;
    },

    async sendHeartbeat(deviceId) {
      const result = await hubApiClient.heartbeat(deviceId);

      if (!result.ok) {
        throw new Error(result.error ?? `Failed to send heartbeat for device ${deviceId}`);
      }

      return {
        success: true,
        lastSeen: new Date().toISOString(),
      };
    },
  };
}
