/**
 * Integrations Service — Unified factory for all integration sub-domains.
 *
 * Consolidates: email, notifications, github, calendar
 * into a single service registry entry. Spotify has been extracted to
 * its own top-level feature folder (`src/main/features/spotify/`).
 */

import { createEmailService } from '../email/email-service';
import { createGitHubWatcher, createNotificationManager, createSlackWatcher } from '../notifications';

import { createCalendarService } from './calendar';
import { createGitHubService } from './github-integration';

import type { CalendarService } from './calendar';
import type { GitHubService } from './github-integration';
import type { OAuthManager } from '../../auth/oauth-manager';
import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';
import type { GitHubClient } from '../../mcp-servers/github/github-client';
import type { EmailService } from '../email/email-service';
import type { NotificationManager } from '../notifications';

// ── Interface ─────────────────────────────────────────────────

export interface IntegrationsService {
  email: EmailService;
  notifications: NotificationManager;
  github: GitHubService;
  calendar: CalendarService;
}

// ── Deps ──────────────────────────────────────────────────────

export interface IntegrationsServiceDeps {
  db: AdcDatabase;
  dataDir: string;
  router: IpcRouter;
  oauthManager: OAuthManager;
  githubCliClient: GitHubClient;
}

// ── Factory ───────────────────────────────────────────────────

export function createIntegrationsService(deps: IntegrationsServiceDeps): IntegrationsService {
  const { db, dataDir, router, oauthManager, githubCliClient } = deps;

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

  const github = createGitHubService({ client: githubCliClient, router });
  const calendar = createCalendarService({ oauthManager });

  return { email, notifications, github, calendar };
}
