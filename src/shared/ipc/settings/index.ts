/**
 * Settings IPC — Barrel Export
 *
 * Re-exports all settings-related schemas (app settings, profiles,
 * webhooks, voice, screen capture, security) and contract definitions.
 */

export {
  AppSettingsSchema,
  CspModeSchema,
  LayoutStateSchema,
  LayoutUpdateSchema,
  ProfileSchema,
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
  SecurityAuditExportSchema,
  SecurityModeSchema,
  SecuritySettingsSchema,
  VoiceConfigSchema,
  VoiceInputModeSchema,
  WebhookConfigSchema,
} from './schemas';

export {
  screenInvoke,
  securityInvoke,
  settingsInvoke,
  voiceEvents,
  voiceInvoke,
} from './contract';

export { SCREEN, SECURITY, SETTINGS, VOICE, VOICE_EVENTS } from './channels';
