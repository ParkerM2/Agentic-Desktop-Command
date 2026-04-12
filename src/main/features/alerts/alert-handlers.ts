/**
 * Alert IPC handlers
 */

import { ALERTS } from '@shared/ipc/misc/alerts.channels';

import type { AlertService } from "./alert-service";
import type { IpcRouter } from '../../ipc/router';

export function registerAlertHandlers(router: IpcRouter, service: AlertService): void {
  router.handle(ALERTS.LIST.ALL, ({ includeExpired }) =>
    Promise.resolve(service.listAlerts(includeExpired ?? false)),
  );

  router.handle(ALERTS.CREATE.ALERT, (data) => Promise.resolve(service.createAlert(data)));

  router.handle(ALERTS.UPDATE.ALERT, (data) => Promise.resolve(service.updateAlert(data)));

  router.handle(ALERTS.DISMISS.ALERT, ({ id }) => Promise.resolve(service.dismissAlert(id)));

  router.handle(ALERTS.DELETE.ALERT, ({ id }) => Promise.resolve(service.deleteAlert(id)));
}
