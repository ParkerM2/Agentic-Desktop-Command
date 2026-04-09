/**
 * Webhook Settings IPC handlers
 */

import { SETTINGS } from '@shared/ipc/settings/channels';

import type { SettingsService } from '../../services/settings/settings-service';
import type { IpcRouter } from '../router';

export function registerWebhookSettingsHandlers(router: IpcRouter, service: SettingsService): void {
  router.handle(SETTINGS.GET['WEBHOOK-CONFIG'], () => Promise.resolve(service.getWebhookConfig()));

  router.handle(SETTINGS.UPDATE['WEBHOOK-CONFIG'], (updates) =>
    Promise.resolve(service.updateWebhookConfig(updates)),
  );
}
