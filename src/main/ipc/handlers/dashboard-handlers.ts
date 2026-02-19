/**
 * Dashboard IPC handlers
 */

import type { DashboardService } from '../../services/dashboard/dashboard-service';
import type { IpcRouter } from '../router';

export function registerDashboardHandlers(router: IpcRouter, service: DashboardService): void {
  router.handle('dashboard.captures.list', () => Promise.resolve(service.listCaptures()));

  router.handle('dashboard.captures.create', ({ text }) =>
    Promise.resolve(service.createCapture(text)),
  );

  router.handle('dashboard.captures.delete', ({ id }) =>
    Promise.resolve(service.deleteCapture(id)),
  );
}
