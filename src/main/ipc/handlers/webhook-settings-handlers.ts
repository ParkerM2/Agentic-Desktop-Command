/**
 * Webhook Settings IPC handlers
 */

import type { SettingsService } from '../../services/settings/settings-service';
import type { IpcRouter } from '../router';

export function registerWebhookSettingsHandlers(
  router: IpcRouter,
  service: SettingsService,
): void {
  router.handle('settings.getWebhookConfig', () =>
    Promise.resolve(service.getWebhookConfig()),
  );

  router.handle('settings.updateWebhookConfig', (updates) =>
    Promise.resolve(service.updateWebhookConfig(updates)),
  );
}
