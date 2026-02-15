/**
 * Workspace domain types
 *
 * These types represent the local IPC view of workspaces and devices.
 * They mirror the Hub API response format from hub-protocol.ts.
 */

export interface WorkspaceSettings {
  autoStart: boolean;
  maxConcurrent: number;
  defaultBranch: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  hostDeviceId?: string;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceCapabilities {
  canExecute: boolean;
  repos: string[];
}

export interface Device {
  id: string;
  machineId?: string;
  userId: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  deviceName: string;
  capabilities: DeviceCapabilities;
  isOnline: boolean;
  lastSeen?: string;
  appVersion?: string;
  createdAt: string;
}
