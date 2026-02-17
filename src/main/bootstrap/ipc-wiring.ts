/**
 * IPC Wiring — registers all IPC handlers on the router.
 *
 * Delegates to the existing registerAllHandlers() in ipc/index.ts.
 * This module exists to keep the bootstrap sequence explicit.
 */

import { registerAllHandlers } from '../ipc';

import type { Services } from '../ipc';
import type { IpcRouter } from '../ipc/router';

/** Registers all IPC request/response handlers on the router. */
export function wireIpcHandlers(router: IpcRouter, services: Services): void {
  registerAllHandlers(router, services);
}
