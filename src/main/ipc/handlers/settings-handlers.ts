/**
 * Settings IPC handlers
 */

import type { AgentSettings } from '@shared/types';

import { loadOAuthCredentials, saveOAuthCredentials } from '../../auth/providers/provider-config';

import type { OAuthConfig } from '../../auth/types';
import type { SettingsService } from '../../services/settings/settings-service';
import type { IpcRouter } from '../router';

export interface SettingsHandlerDeps {
  dataDir: string;
  providers: Map<string, OAuthConfig>;
  onAgentSettingsChanged?: (settings: AgentSettings) => void;
}

export function registerSettingsHandlers(
  router: IpcRouter,
  service: SettingsService,
  deps: SettingsHandlerDeps,
): void {
  router.handle('settings.get', () => Promise.resolve(service.getSettings()));

  router.handle('settings.update', (updates) => Promise.resolve(service.updateSettings(updates)));

  router.handle('settings.getProfiles', () => Promise.resolve(service.getProfiles()));

  router.handle('settings.createProfile', (data) => Promise.resolve(service.createProfile(data)));

  router.handle('settings.updateProfile', ({ id, updates }) =>
    Promise.resolve(service.updateProfile(id, updates)),
  );

  router.handle('settings.deleteProfile', ({ id }) => Promise.resolve(service.deleteProfile(id)));

  router.handle('settings.setDefaultProfile', ({ id }) =>
    Promise.resolve(service.setDefaultProfile(id)),
  );

  router.handle('settings.getOAuthProviders', () => {
    const creds = loadOAuthCredentials(deps.dataDir);
    const result = [...deps.providers.keys()].map((name) => ({
      name,
      hasCredentials: creds.has(name) || (deps.providers.get(name)?.clientId ?? '').length > 0,
    }));
    return Promise.resolve(result);
  });

  router.handle('settings.setOAuthProvider', ({ name, clientId, clientSecret }) => {
    saveOAuthCredentials(deps.dataDir, name, { clientId, clientSecret });
    // Update the live provider config so OAuth flows use the new credentials
    const existing = deps.providers.get(name);
    if (existing) {
      deps.providers.set(name, { ...existing, clientId, clientSecret });
    }
    return Promise.resolve({ success: true });
  });

  router.handle('settings.getAgentSettings', () => Promise.resolve(service.getAgentSettings()));

  router.handle('settings.setAgentSettings', (settings) => {
    const result = service.setAgentSettings(settings);
    // Notify callback to sync queue with new settings
    deps.onAgentSettingsChanged?.(service.getAgentSettings());
    return Promise.resolve(result);
  });

  router.handle('app.getVersion', () => Promise.resolve(service.getAppVersion()));
}
