/**
 * Settings IPC — Barrel Export
 *
 * Re-exports all settings-related schemas (app settings, profiles,
 * webhooks, voice, security) and contract definitions.
 */

export {
  AppSettingsSchema,
  CspModeSchema,
  LayoutStateSchema,
  LayoutUpdateSchema,
  ProfileSchema,
  SecurityAuditExportSchema,
  SecurityModeSchema,
  SecuritySettingsSchema,
  VoiceConfigSchema,
  VoiceInputModeSchema,
  WebhookConfigSchema,
} from './schemas';

export {
  securityInvoke,
  settingsInvoke,
  voiceEvents,
  voiceInvoke,
} from './contract';

export { SECURITY, SETTINGS, VOICE, VOICE_EVENTS } from './channels';
