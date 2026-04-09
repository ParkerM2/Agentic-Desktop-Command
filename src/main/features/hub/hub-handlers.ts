/**
 * Hub IPC handlers
 *
 * Hub task channels (`hub.tasks.*`) are registered in `task-handlers.ts`.
 */

import { HUB, HUB_EVENTS } from '@shared/ipc/hub/channels';

import type { HubApiClient } from "./hub-api-client";
import type { HubConnectionManager } from "./hub-connection";
import type { HubSyncService } from "./hub-sync";
import type { IpcRouter } from '../../ipc/router';

export function registerHubHandlers(
  router: IpcRouter,
  connectionManager: HubConnectionManager,
  syncService: HubSyncService,
  _hubApiClient: HubApiClient,
): void {
  router.handle(HUB.CONNECT.SERVER, async ({ url, apiKey }) => {
    connectionManager.configure(url, apiKey);
    const result = await connectionManager.connect();
    return { success: result.success, error: result.error };
  });

  router.handle(HUB.DISCONNECT.SERVER, () => {
    connectionManager.disconnect();
    return Promise.resolve({ success: true });
  });

  router.handle(HUB.GET.STATUS, () => {
    const connection = connectionManager.getConnection();
    return Promise.resolve({
      status: connectionManager.getStatus(),
      hubUrl: connection?.hubUrl,
      enabled: connection?.enabled ?? false,
      lastConnected: connection?.lastConnected,
      pendingMutations: syncService.getPendingCount(),
    });
  });

  router.handle(HUB.SYNC.DATA, async () => {
    const syncedCount = await syncService.syncPending();
    if (syncedCount > 0) {
      router.emit(HUB_EVENTS.SYNC.COMPLETED, { entities: [], syncedCount });
    }
    return { syncedCount, pendingCount: syncService.getPendingCount() };
  });

  router.handle(HUB.GET.CONFIG, () => {
    const connection = connectionManager.getConnection();
    return Promise.resolve({
      hubUrl: connection?.hubUrl,
      enabled: connection?.enabled ?? false,
      lastConnected: connection?.lastConnected,
    });
  });

  router.handle(HUB.REMOVE.CONFIG, () => {
    connectionManager.removeConfig();
    return Promise.resolve({ success: true });
  });
}
