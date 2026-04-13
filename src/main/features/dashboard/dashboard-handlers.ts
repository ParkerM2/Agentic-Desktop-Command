/**
 * Dashboard IPC handlers
 */

import { DASHBOARD } from '@shared/ipc/dashboard/channels';

import type { DashboardService } from "./dashboard-service";
import type { IpcRouter } from '../../ipc/router';

export function registerDashboardHandlers(router: IpcRouter, service: DashboardService): void {
  router.handle(DASHBOARD.LIST.CAPTURES, () => Promise.resolve(service.listCaptures()));

  router.handle(DASHBOARD.CREATE.CAPTURE, ({ text, id }) =>
    Promise.resolve(service.createCapture(text, id)),
  );

  router.handle(DASHBOARD.UPDATE.CAPTURE, ({ id, text }) =>
    Promise.resolve(service.updateCapture(id, text)),
  );

  router.handle(DASHBOARD.DELETE.CAPTURE, ({ id }) =>
    Promise.resolve(service.deleteCapture(id)),
  );
}
