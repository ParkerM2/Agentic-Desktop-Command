/**
 * Settings IPC — Barrel Export
 *
 * Re-exports all settings-related schemas (app settings, profiles,
 * webhooks, security) and contract definitions.
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
  WebhookConfigSchema,
} from './schemas';

export {
  securityInvoke,
  settingsInvoke,
} from './contract';

export { SECURITY, SETTINGS } from './channels';
