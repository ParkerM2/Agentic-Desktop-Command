/**
 * Integrations Service — Unified factory for remaining integration sub-domains.
 *
 * Consolidates: email, notifications, calendar
 * into a single service registry entry. Spotify and GitHub have been extracted
 * to their own top-level feature folders (`src/main/features/spotify/`,
 * `src/main/features/github/`).
 */

import { createEmailService } from '../email/email-service';
import { createGitHubWatcher, createNotificationManager, createSlackWatcher } from '../notifications';

import { createCalendarService } from './calendar';

import type { CalendarService } from './calendar';
import type { OAuthManager } from '../../auth/oauth-manager';
import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';
import type { EmailService } from '../email/email-service';
import type { NotificationManager } from '../notifications';

// ── Interface ─────────────────────────────────────────────────

export interface IntegrationsService {
  email: EmailService;
  notifications: NotificationManager;
  calendar: CalendarService;
}

// ── Deps ──────────────────────────────────────────────────────

export interface IntegrationsServiceDeps {
  db: AdcDatabase;
  dataDir: string;
  router: IpcRouter;
  oauthManager: OAuthManager;
}

// ── Factory ───────────────────────────────────────────────────

export function createIntegrationsService(deps: IntegrationsServiceDeps): IntegrationsService {
  const { db, dataDir, router, oauthManager } = deps;

  const email = createEmailService({ db, dataDir, router });

  const notifications = (() => {
    const mgr = createNotificationManager(router, db, dataDir);
    const slackWatcher = createSlackWatcher({
      oauthManager,
      router,
      notificationManager: mgr,
      getConfig: () => mgr.getConfig().slack,
    });
    mgr.registerWatcher(slackWatcher);
    const githubWatcher = createGitHubWatcher({
      router,
      notificationManager: mgr,
      getConfig: () => mgr.getConfig().github,
    });
    mgr.registerWatcher(githubWatcher);
    const notifConfig = mgr.getConfig();
    if (notifConfig.enabled) mgr.startWatching();
    return mgr;
  })();

  const calendar = createCalendarService({ oauthManager });

  return { email, notifications, calendar };
}
