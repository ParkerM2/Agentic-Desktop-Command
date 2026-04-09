/**
 * Settings IPC handlers
 */

import { APP } from '@shared/ipc/app/channels';
import { SETTINGS } from '@shared/ipc/settings/channels';

import { loadOAuthCredentials, saveOAuthCredentials } from '../../auth/providers/provider-config';

import type { SettingsService } from "./settings-service";
import type { OAuthConfig } from '../../auth/types';
import type { IpcRouter } from '../../ipc/router';

export interface SettingsHandlerDeps {
  dataDir: string;
  providers: Map<string, OAuthConfig>;
}

export function registerSettingsHandlers(
  router: IpcRouter,
  service: SettingsService,
  deps: SettingsHandlerDeps,
): void {
  router.handle(SETTINGS.GET.ALL, () => Promise.resolve(service.getSettings()));

  router.handle(SETTINGS.UPDATE.ALL, (updates) => Promise.resolve(service.updateSettings(updates)));

  router.handle(SETTINGS.GET.PROFILES, () => Promise.resolve(service.getProfiles()));

  router.handle(SETTINGS.CREATE.PROFILE, (data) => Promise.resolve(service.createProfile(data)));

  router.handle(SETTINGS.UPDATE.PROFILE, ({ id, updates }) =>
    Promise.resolve(service.updateProfile(id, updates)),
  );

  router.handle(SETTINGS.DELETE.PROFILE, ({ id }) => Promise.resolve(service.deleteProfile(id)));

  router.handle(SETTINGS.SET['DEFAULT-PROFILE'], ({ id }) =>
    Promise.resolve(service.setDefaultProfile(id)),
  );

  router.handle(SETTINGS.GET['OAUTH-PROVIDERS'], () => {
    const creds = loadOAuthCredentials(deps.dataDir);
    const result = [...deps.providers.keys()].map((name) => ({
      name,
      hasCredentials: creds.has(name) || (deps.providers.get(name)?.clientId ?? '').length > 0,
    }));
    return Promise.resolve(result);
  });

  router.handle(SETTINGS.SET['OAUTH-PROVIDER'], ({ name, clientId, clientSecret }) => {
    saveOAuthCredentials(deps.dataDir, name, { clientId, clientSecret });
    // Update the live provider config so OAuth flows use the new credentials
    const existing = deps.providers.get(name);
    if (existing) {
      deps.providers.set(name, { ...existing, clientId, clientSecret });
    }
    return Promise.resolve({ success: true });
  });

  router.handle(SETTINGS.GET['AGENT-SETTINGS'], () => Promise.resolve(service.getAgentSettings()));

  router.handle(SETTINGS.SET['AGENT-SETTINGS'], (settings) => {
    return Promise.resolve(service.setAgentSettings(settings));
  });

  router.handle(APP.GET.VERSION, () => Promise.resolve(service.getAppVersion()));

  router.handle(SETTINGS.GET.LAYOUT, () => Promise.resolve(service.getLayout()));

  router.handle(SETTINGS.SAVE.LAYOUT, (updates) => Promise.resolve(service.saveLayout(updates)));
}
