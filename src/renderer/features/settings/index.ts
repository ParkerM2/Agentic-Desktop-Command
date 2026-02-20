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
export {
  useDataRegistry,
  useDataUsage,
  useDataRetention,
  useUpdateRetention,
  useClearStore,
  useRunCleanup,
  useExportData,
  useImportData,
  dataManagementKeys,
} from './api/useDataManagement';
export { useOAuthStatus, useOAuthAuthorize, useOAuthRevoke, oauthKeys } from './api/useOAuth';
export { useWebhookConfig, useUpdateWebhookConfig } from './api/useWebhookConfig';
export { useDataManagementEvents } from './hooks/useDataManagementEvents';
export { SettingsPage } from './components/SettingsPage';
export { StorageManagementSection } from './components/StorageManagementSection';
export { StorageUsageBar } from './components/StorageUsageBar';
export { RetentionControl } from './components/RetentionControl';
export { WorkspacesTab } from './components/WorkspacesTab';
export { DeviceCard } from './components/DeviceCard';
export { ThemeEditorPage } from './components/theme-editor';

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
