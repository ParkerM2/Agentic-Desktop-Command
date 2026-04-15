/**
 * Integrations IPC Handlers — Registers all integration domain handlers.
 *
 * Delegates to: email, notifications, github, calendar sub-modules.
 */

import { registerEmailHandlers } from '../email/email-handlers';
import { registerNotificationHandlers } from '../notifications/notification-handlers';

import { registerCalendarHandlers } from './calendar';
import { registerGitHubHandlers } from './github-integration';

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
}
