/**
 * Webhook Settings IPC handlers
 */

import { SETTINGS } from '@shared/ipc/settings/channels';

import type { IpcRouter } from '../../ipc/router';
import type { SettingsService } from "../settings/settings-service";

export function registerWebhookSettingsHandlers(router: IpcRouter, service: SettingsService): void {
  router.handle(SETTINGS.GET['WEBHOOK-CONFIG'], () => Promise.resolve(service.getWebhookConfig()));

  router.handle(SETTINGS.UPDATE['WEBHOOK-CONFIG'], (updates) =>
    Promise.resolve(service.updateWebhookConfig(updates)),
  );
}
