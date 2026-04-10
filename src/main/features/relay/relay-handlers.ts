/**
 * Relay IPC Handlers
 *
 * Thin wrappers that delegate to RelayService for all relay-domain
 * invoke channels. No business logic here.
 */

import { RELAY } from '@shared/ipc/relay/channels';

import type { RelayService } from './relay-service';
import type { IpcRouter } from '../../ipc/router';

export function registerRelayHandlers(
  router: IpcRouter,
  relayService: RelayService,
): void {
  router.handle(RELAY.CLAIM.PROJECT, ({ projectId }) =>
    relayService.claimProject(projectId),
  );

  router.handle(RELAY.RELEASE.PROJECT, ({ projectId }) =>
    relayService.releaseProject(projectId).then(() => ({ success: true })),
  );

  router.handle(RELAY.RECLAIM.PROJECT, ({ projectId }) =>
    relayService.forceReclaimProject(projectId).then(() => ({
      success: true,
      reclaimedAt: new Date().toISOString(),
    })),
  );

  router.handle(RELAY.SPAWN.SESSION, ({ projectId, agentRole, prompt, workDir, taskId }) => {
    const sessionId = relayService.spawnRemoteSession(projectId, {
      agentRole,
      prompt,
      workDir,
      taskId: taskId ?? '',
    });
    return Promise.resolve({ sessionId });
  });

  router.handle(RELAY.SEND.INPUT, ({ sessionId, data }) => {
    relayService.sendInput(sessionId, data);
    return Promise.resolve({ success: true });
  });

  router.handle(RELAY.LIST.SESSIONS, ({ projectId }) =>
    Promise.resolve(relayService.listSessions(projectId)),
  );

  router.handle(RELAY.GET.BUFFER, ({ sessionId }) =>
    relayService.getBuffer(sessionId),
  );

  router.handle(RELAY.RENEW.CLAIM, ({ projectId }) =>
    relayService.renewClaim(projectId).then(() => ({
      success: true,
      renewedAt: new Date().toISOString(),
    })),
  );
}
