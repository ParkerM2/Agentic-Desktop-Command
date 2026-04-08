/**
 * Relay Service — Internal Types
 *
 * Internal types used by relay service logic and relay IPC handlers.
 * These are NOT exported via @shared — they exist only in the main process.
 */

// ─── Claim Results ────────────────────────────────────────────

export interface RelayClaimResult {
  success: boolean;
  projectId: string;
  claimedByDeviceId?: string;
  hostDeviceId?: string;
  expiresAt?: string;
  error?: string;
}

export interface RelayReleaseResult {
  success: boolean;
  error?: string;
}

// ─── Hub API Response Shapes (snake_case from wire) ──────────

export interface RemoteProjectRaw {
  id: string;
  name: string;
  root_path?: string;
  path?: string;
  host_device_id: string;
  host_device_name?: string;
  claimed_by_device_id?: string;
  git_url?: string;
  default_branch?: string;
  created_at: string;
  updated_at: string;
}

export interface AllDevicesProjectsResponse {
  projects: RemoteProjectRaw[];
}

export interface HubClaimResponseData {
  projectId: string;
  claimedByDeviceId: string;
  hostDeviceId: string;
  expiresAt: string;
  forceReclaim?: boolean;
}

export interface HubClaimResponse {
  success: boolean;
  data?: HubClaimResponseData;
  error?: string;
  claimedByDeviceId?: string;
  expiresAt?: string;
}
