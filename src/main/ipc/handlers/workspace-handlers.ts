/**
 * Workspace IPC handlers — Proxies to Hub API via HubApiClient
 */

import type { Workspace } from '@shared/types';

import type { HubApiClient } from '../../services/hub/hub-api-client';
import type { IpcRouter } from '../router';

export function registerWorkspaceHandlers(router: IpcRouter, hubApiClient: HubApiClient): void {
  router.handle('workspaces.list', async () => {
    const result = await hubApiClient.hubGet<{ workspaces: Workspace[] }>('/api/workspaces');

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to fetch workspaces');
    }

    return result.data.workspaces;
  });

  router.handle('workspaces.create', async ({ name, description }) => {
    const result = await hubApiClient.hubPost<Workspace>('/api/workspaces', {
      name,
      description,
    });

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to create workspace');
    }

    return result.data;
  });

  router.handle('workspaces.update', async ({ id, ...updates }) => {
    const result = await hubApiClient.hubPatch<Workspace>(
      `/api/workspaces/${encodeURIComponent(id)}`,
      updates,
    );

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? `Failed to update workspace ${id}`);
    }

    return result.data;
  });

  router.handle('workspaces.delete', async ({ id }) => {
    const result = await hubApiClient.hubDelete(`/api/workspaces/${encodeURIComponent(id)}`);

    if (!result.ok) {
      throw new Error(result.error ?? `Failed to delete workspace ${id}`);
    }

    return { success: true };
  });
}
