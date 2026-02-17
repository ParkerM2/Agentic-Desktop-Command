/**
 * Hub Protocol — User & Auth Types
 */

import type { Device, DeviceCapabilities } from './devices';
import type { DeviceType } from './enums';

// ─── User ────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  lastLoginAt?: string;
}

// ─── Auth Requests & Responses ───────────────────────────────

export interface AuthRegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
  deviceInfo?: {
    machineId?: string;
    deviceName: string;
    deviceType: DeviceType;
    capabilities?: DeviceCapabilities;
    appVersion?: string;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  device?: Device;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
