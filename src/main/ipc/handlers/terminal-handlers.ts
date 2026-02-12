/**
 * Terminal IPC handlers
 */

import type { TerminalService } from '../../services/terminal/terminal-service';
import type { IpcRouter } from '../router';

export function registerTerminalHandlers(router: IpcRouter, service: TerminalService): void {
  router.handle('terminals.list', ({ projectPath }) =>
    Promise.resolve(service.listTerminals(projectPath)),
  );

  router.handle('terminals.create', ({ cwd, projectPath }) =>
    Promise.resolve(service.createTerminal(cwd, projectPath)),
  );

  router.handle('terminals.close', ({ sessionId }) =>
    Promise.resolve(service.closeTerminal(sessionId)),
  );

  router.handle('terminals.sendInput', ({ sessionId, data }) =>
    Promise.resolve(service.sendInput(sessionId, data)),
  );

  router.handle('terminals.resize', ({ sessionId, cols, rows }) =>
    Promise.resolve(service.resizeTerminal(sessionId, cols, rows)),
  );

  router.handle('terminals.invokeClaudeCli', ({ sessionId, cwd }) =>
    Promise.resolve(service.invokeClaudeCli(sessionId, cwd)),
  );
}
