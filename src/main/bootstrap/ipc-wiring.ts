/**
 * IPC Wiring — registers all IPC handlers on the router.
 *
 * Delegates to the existing registerAllHandlers() in ipc/index.ts.
 * This module exists to keep the bootstrap sequence explicit.
 *
 * When a CommandBus is provided, it is attached to the router AFTER
 * all handlers are registered so every IPC call flows through the bus
 * for SQLite tracking.
 */

import { registerAllHandlers } from '../ipc';

import type { CommandBus } from '../bus';
import type { Services } from '../ipc';
import type { IpcRouter } from '../ipc/router';

/** Registers all IPC request/response handlers on the router, then attaches the command bus. */
export function wireIpcHandlers(router: IpcRouter, services: Services, commandBus?: CommandBus): void {
  registerAllHandlers(router, services);

  // Attach bus AFTER all handlers are registered so they're bulk-registered on the bus
  if (commandBus) {
    router.setBus(commandBus);
  }
}
