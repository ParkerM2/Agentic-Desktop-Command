/**
 * Settings IPC — Barrel Export
 *
 * Re-exports all settings-related schemas (app settings, profiles,
 * webhooks, voice, screen capture) and contract definitions.
 */

export {
  AppSettingsSchema,
  ProfileSchema,
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
  VoiceConfigSchema,
  VoiceInputModeSchema,
  WebhookConfigSchema,
} from './schemas';

export {
  hotkeysInvoke,
  screenInvoke,
  settingsEvents,
  settingsInvoke,
  voiceInvoke,
} from './contract';
