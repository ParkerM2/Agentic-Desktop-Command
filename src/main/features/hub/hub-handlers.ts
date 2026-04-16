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

  router.handle(HUB.GENERATE.KEY, async ({ url, bootstrapSecret }) => {
    try {
      const normalized = url.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (bootstrapSecret.length > 0) {
        headers['X-Bootstrap-Secret'] = bootstrapSecret;
      }
      const res = await fetch(`${normalized}/api/auth/generate-key`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        let hint = 'Check the Hub URL and try again.';
        if (res.status === 401) {
          hint = bootstrapSecret.length === 0
            ? 'This Hub requires a bootstrap secret. Check HUB_BOOTSTRAP_SECRET in the Hub\'s environment and enter it below.'
            : 'Bootstrap secret is incorrect.';
        } else if (res.status === 403) {
          hint =
            'Hub already has keys. Ask the admin to set HUB_BOOTSTRAP_SECRET on the Hub container so the UI can mint a replacement key.';
        }
        return {
          success: false,
          error: body.error ?? `Hub rejected the request (HTTP ${String(res.status)}). ${hint}`,
        };
      }

      const body = (await res.json()) as { key?: string };
      if (!body.key) {
        return { success: false, error: 'Hub response missing key field.' };
      }

      return { success: true, key: body.key };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reach Hub.',
      };
    }
  });
}
