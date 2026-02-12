/**
 * Settings IPC handlers
 */

import type { SettingsService } from '../../services/settings/settings-service';
import type { IpcRouter } from '../router';

export function registerSettingsHandlers(router: IpcRouter, service: SettingsService): void {
  router.handle('settings.get', () => Promise.resolve(service.getSettings()));

  router.handle('settings.update', (updates) => Promise.resolve(service.updateSettings(updates)));

  router.handle('settings.getProfiles', () => Promise.resolve(service.getProfiles()));

  router.handle('settings.createProfile', (data) =>
    Promise.resolve(service.createProfile(data)),
  );

  router.handle('settings.updateProfile', ({ id, updates }) =>
    Promise.resolve(service.updateProfile(id, updates)),
  );

  router.handle('settings.deleteProfile', ({ id }) =>
    Promise.resolve(service.deleteProfile(id)),
  );

  router.handle('settings.setDefaultProfile', ({ id }) =>
    Promise.resolve(service.setDefaultProfile(id)),
  );

  router.handle('app.getVersion', () => Promise.resolve(service.getAppVersion()));
}
