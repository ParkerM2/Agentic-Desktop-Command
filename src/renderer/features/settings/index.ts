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
  useAgentSettings,
  useUpdateAgentSettings,
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
} from '@features/workspace';

// Devices (absorbed from @features/devices)
export { useDevices, useRegisterDevice, useUpdateDevice } from './api/useDevices';
export { deviceKeys } from './api/deviceQueryKeys';

// Screen capture (absorbed from @features/screen)
export { useAvailableSources, useCaptureScreen, useScreenPermission } from './api/useScreenCapture';
export { screenKeys } from './api/screenQueryKeys';
export { ScreenshotButton } from './components/screen/ScreenshotButton';
export { ScreenshotViewer } from './components/screen/ScreenshotViewer';

// Voice (absorbed from @features/voice)
export { useVoiceConfig, useUpdateVoiceConfig, useVoicePermission } from './api/useVoice';
export { voiceKeys } from './api/voiceQueryKeys';
export { VoiceButton } from './components/voice/VoiceButton';
export type { VoiceButtonProps } from './components/voice/VoiceButton';
export { VoiceSettings } from './components/voice/VoiceSettings';
export type { VoiceSettingsProps } from './components/voice/VoiceSettings';
export { useSpeechRecognition } from './hooks/useSpeechRecognition';
export type {
  SpeechRecognitionState,
  SpeechRecognitionControls,
  UseSpeechRecognitionOptions,
} from './hooks/useSpeechRecognition';
export { useSpeechSynthesis, findVoice, getDefaultVoice } from './hooks/useSpeechSynthesis';
export type {
  SpeechSynthesisState,
  SpeechSynthesisControls,
  SpeakOptions,
} from './hooks/useSpeechSynthesis';

// Health (absorbed from @features/health)
export {
  useClearErrorLog,
  useErrorLog,
  useErrorStats,
  useHealthStatus,
  useReportError,
} from './api/useHealth';
export { healthKeys } from './api/healthQueryKeys';
export { HealthIndicator } from './components/health/HealthIndicator';
export { HealthPanel } from './components/health/HealthPanel';
export { useErrorEvents } from './hooks/useErrorEvents';
export { AppBehaviorSection } from './components/AppBehaviorSection';
