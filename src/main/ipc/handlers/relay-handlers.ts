/**
 * Relay IPC Handlers — Project claim/unclaim via Hub API
 *
 * Handles relay.claimProject and relay.unclaimProject channels.
 * Calls Hub REST API and emits local IPC events on success.
 */

import type { HubApiClient } from '../../services/hub/hub-api-client';
import type { HubClaimResponse } from '../../services/relay/relay-types';
import type { IpcRouter } from '../router';

export function registerRelayHandlers(
  router: IpcRouter,
  hubApiClient: HubApiClient,
  getDeviceId: () => string | null,
): void {
  // ─── relay.claimProject ──────────────────────────────────────
  router.handle('relay.claimProject', async ({ projectId, hostDeviceId }) => {
    const deviceId = getDeviceId();
    if (!deviceId) {
      return { success: false, error: 'Device not registered — cannot claim project' };
    }

    const result = await hubApiClient.hubPost<HubClaimResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/claim`,
      { deviceId },
    );

    if (!result.ok) {
      return { success: false, error: result.error ?? 'Failed to claim project' };
    }

    const { data } = result;
    const claimedByDeviceId = data?.data?.claimedByDeviceId ?? deviceId;
    const claimedAt = data?.data?.expiresAt
      ? new Date(Date.now()).toISOString()
      : new Date().toISOString();

    router.emit('event:relay.projectClaimed', {
      projectId,
      claimedByDeviceId,
      claimedAt,
    });

    // Suppress unused parameter warning — hostDeviceId is validated by Zod schema
    void hostDeviceId;

    return { success: true };
  });

  // ─── relay.unclaimProject ────────────────────────────────────
  router.handle('relay.unclaimProject', async ({ projectId }) => {
    const deviceId = getDeviceId();
    if (!deviceId) {
      throw new Error('Device not registered — cannot unclaim project');
    }

    const result = await hubApiClient.hubPost<{ success: boolean }>(
      `/api/projects/${encodeURIComponent(projectId)}/release`,
      { deviceId },
    );

    if (!result.ok) {
      throw new Error(result.error ?? 'Failed to release project claim');
    }

    router.emit('event:relay.projectUnclaimed', {
      projectId,
      unclaimedAt: new Date().toISOString(),
    });

    return { success: true };
  });
}
