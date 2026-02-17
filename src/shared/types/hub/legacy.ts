/**
 * Hub Protocol — Legacy/Deprecated Types
 *
 * These types exist for backwards compatibility only.
 * They should NOT be used in new code.
 */

import type { Device, DeviceCapabilities, DeviceRegisterRequest, DeviceUpdateRequest } from './devices';

/** @deprecated Use DeviceCapabilities instead */
export type ComputerCapabilities = DeviceCapabilities;

/** @deprecated Use Device instead */
export type Computer = Device;

/** @deprecated Use DeviceRegisterRequest instead */
export type DeviceAuthRequest = DeviceRegisterRequest;

/** @deprecated Use AuthResponse instead */
export interface DeviceAuthResponse {
  deviceId: string;
  token: string;
  expiresAt: string;
  hubVersion: string;
}

/** @deprecated Use DeviceUpdateRequest instead */
export type ComputerUpdateRequest = DeviceUpdateRequest;

/** @deprecated Use DeviceListResponse instead — note: uses `devices` not `computers` */
export interface ComputerListResponse {
  computers: Device[];
}

/** @deprecated Use WsDeviceOnlineEvent instead */
export interface WsComputerOnlineEvent {
  type: 'computer:online';
  computer: Device;
}

/** @deprecated Use WsDeviceOfflineEvent instead */
export interface WsComputerOfflineEvent {
  type: 'computer:offline';
  computerId: string;
  lastSeen: string;
}

/** @deprecated Use isWsDeviceEvent instead */
export function isWsComputerEvent(event: { type: string }): boolean {
  return event.type.startsWith('computer:');
}
