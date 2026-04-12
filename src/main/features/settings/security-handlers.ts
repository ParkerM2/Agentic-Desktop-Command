/**
 * Security IPC handlers
 *
 * Maps security IPC channels to settings service operations.
 * Security settings are stored as a sub-object within AppSettings.
 */

import { SECURITY } from '@shared/ipc/security/channels';
import { ipcInvokeContract } from '@shared/ipc-contract';
import { DEFAULT_SECURITY_SETTINGS } from '@shared/types/security';
import type { SecuritySettings } from '@shared/types/security';

import type { SettingsService } from "./settings-service";
import type { IpcRouter } from '../../ipc/router';

export function registerSecurityHandlers(router: IpcRouter, service: SettingsService): void {
  router.handle(SECURITY.GET.SETTINGS, () => {
    const settings = service.getSettings();
    return Promise.resolve(settings.securitySettings ?? DEFAULT_SECURITY_SETTINGS);
  });

  router.handle(SECURITY.UPDATE.SETTINGS, (updates) => {
    const current = service.getSettings();
    const currentSecurity = current.securitySettings ?? DEFAULT_SECURITY_SETTINGS;
    const merged: SecuritySettings = {
      ...currentSecurity,
      ...updates,
    };
    service.updateSettings({ securitySettings: merged });
    return Promise.resolve(merged);
  });

  router.handle(SECURITY.EXPORT.AUDIT, () => {
    const settings = service.getSettings();
    const securitySettings = settings.securitySettings ?? DEFAULT_SECURITY_SETTINGS;
    const channelCount = Object.keys(ipcInvokeContract).length;

    return Promise.resolve({
      exportedAt: new Date().toISOString(),
      settings: securitySettings,
      ipcChannelCount: channelCount,
      activeAgentCount: 0,
    });
  });
}
