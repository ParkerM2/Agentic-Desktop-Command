/**
 * Dashboard IPC handlers
 */

import { DASHBOARD } from '@shared/ipc/dashboard/channels';

import type { DashboardService } from '../../services/dashboard/dashboard-service';
import type { IpcRouter } from '../router';

export function registerDashboardHandlers(router: IpcRouter, service: DashboardService): void {
  router.handle(DASHBOARD.LIST.CAPTURES, () => Promise.resolve(service.listCaptures()));

  router.handle(DASHBOARD.CREATE.CAPTURE, ({ text }) =>
    Promise.resolve(service.createCapture(text)),
  );

  router.handle(DASHBOARD.DELETE.CAPTURE, ({ id }) =>
    Promise.resolve(service.deleteCapture(id)),
  );
}
