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
  router.handle(BUS.QUERY.COMMANDS, (input) =>
    Promise.resolve(commandBus.queryCommands(input)),
  );

  router.handle(BUS.QUERY.EVENTS, (input) =>
    Promise.resolve(commandBus.queryEvents(input)),
  );

  router.handle(BUS.LIST.SESSIONS, (input) =>
    Promise.resolve(sessionManager.list(input)),
  );

  router.handle(BUS.GET.SESSION, (input) =>
    Promise.resolve(sessionManager.get(input.sessionId) ?? null),
  );

  router.handle(BUS.GET.REGISTRY, () =>
    Promise.resolve(commandBus.getRegistry().map((r) => ({
      channel: r.channel,
      domain: r.domain,
      verb: r.verb,
      noun: r.noun,
      isMutation: r.isMutation,
    }))),
  );

  router.handle(BUS.SPAWN.SESSION, (input) =>
    sessionManager.spawn(input),
  );

  router.handle(BUS.KILL.SESSION, async (input) => {
    await sessionManager.kill(input.sessionId);
    return { success: true };
  });
}
