/**
 * Handler Registry
 *
 * Imports and registers all IPC handlers with the typed router.
 */
import type { IpcRouter } from '../router';
import { registerProjectHandlers } from './project-handlers';
import { registerTaskHandlers } from './task-handlers';
import { registerTerminalHandlers } from './terminal-handlers';
import { registerAppHandlers } from './app-handlers';

export function registerAllHandlers(router: IpcRouter) {
  registerProjectHandlers(router);
  registerTaskHandlers(router);
  registerTerminalHandlers(router);
  registerAppHandlers(router);
}
