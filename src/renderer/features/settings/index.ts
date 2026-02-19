/**
 * Settings feature — public API
 */

export {
  useSettings,
  useUpdateSettings,
  useProfiles,
  useCreateProfile,
  useUpdateProfile,
  useDeleteProfile,
  useSetDefaultProfile,
  settingsKeys,
} from './api/useSettings';
export { useOAuthStatus, useOAuthAuthorize, useOAuthRevoke, oauthKeys } from './api/useOAuth';
export { useWebhookConfig, useUpdateWebhookConfig } from './api/useWebhookConfig';
export { SettingsPage } from './components/SettingsPage';
export { WorkspacesTab } from './components/WorkspacesTab';
export { DeviceCard } from './components/DeviceCard';

// Re-export from dedicated feature modules for backward compatibility
export {
  useWorkspaces,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  workspaceKeys,
  useWorkspaceEvents,
} from '@features/workspaces';
export { useDevices, deviceKeys, useDeviceEvents } from '@features/devices';
