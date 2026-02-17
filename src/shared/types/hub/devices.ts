/**
 * Hub Protocol — Device Types
 */

import type { DeviceType } from './enums';

// ─── Device Models ───────────────────────────────────────────

export interface DeviceCapabilities {
  canExecute: boolean;
  repos: string[];
}

export interface Device {
  id: string;
  machineId?: string;
  userId: string;
  deviceType: DeviceType;
  deviceName: string;
  nickname?: string;
  capabilities: DeviceCapabilities;
  isOnline: boolean;
  lastSeen?: string;
  appVersion?: string;
  createdAt: string;
}

// ─── Device Requests & Responses ─────────────────────────────

export interface DeviceRegisterRequest {
  machineId?: string;
  deviceName: string;
  deviceType: DeviceType;
  capabilities: DeviceCapabilities;
  appVersion?: string;
}

export interface DeviceUpdateRequest {
  deviceName?: string;
  capabilities?: Partial<DeviceCapabilities>;
  isOnline?: boolean;
  appVersion?: string;
}

export interface DeviceListResponse {
  devices: Device[];
}
