/**
 * Integrations IPC Handlers — Registers all integration domain handlers.
 *
 * Delegates to: email, notifications, spotify, github, calendar sub-modules.
 */

import { registerCalendarHandlers } from './calendar';
import { registerEmailHandlers } from '../email/email-handlers';
import { registerGitHubHandlers } from './github-integration';
import { registerNotificationHandlers } from '../notifications/notification-handlers';
import { registerSpotifyHandlers } from './spotify';

import type { IntegrationsService } from './integrations-service';
import type { IpcRouter } from '../../ipc/router';

export function registerIntegrationsHandlers(
  router: IpcRouter,
  service: IntegrationsService,
): void {
  registerCalendarHandlers(router, service.calendar);
  registerEmailHandlers(router, service.email);
  registerGitHubHandlers(router, service.github);
  registerNotificationHandlers(router, service.notifications);
  registerSpotifyHandlers(router, service.spotify);
}
