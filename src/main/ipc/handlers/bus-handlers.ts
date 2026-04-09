/**
 * Bus IPC handlers
 *
 * Exposes command bus queries, session lifecycle, and registry
 * inspection to the renderer.
 */

import { BUS } from '@shared/ipc/bus/channels';

import type { CommandBus } from '../../bus';
import type { BusSessionManager } from '../../bus/session-manager';
import type { IpcRouter } from '../router';

export function registerBusHandlers(
  router: IpcRouter,
  commandBus: CommandBus,
  sessionManager: BusSessionManager,
): void {
  router.handle(BUS.QUERY.COMMANDS, async (input) =>
    commandBus.queryCommands(input),
  );

  router.handle(BUS.QUERY.EVENTS, async (input) =>
    commandBus.queryEvents(input),
  );

  router.handle(BUS.LIST.SESSIONS, async (input) =>
    sessionManager.list(input),
  );

  router.handle(BUS.GET.SESSION, async (input) =>
    sessionManager.get(input.sessionId) ?? null,
  );

  router.handle(BUS.GET.REGISTRY, async () =>
    commandBus.getRegistry().map((r) => ({
      channel: r.channel,
      domain: r.domain,
      verb: r.verb,
      noun: r.noun,
      isMutation: r.isMutation,
    })),
  );

  router.handle(BUS.SPAWN.SESSION, async (input) =>
    sessionManager.spawn(input),
  );

  router.handle(BUS.KILL.SESSION, async (input) => {
    await sessionManager.kill(input.sessionId);
    return { success: true };
  });
}
