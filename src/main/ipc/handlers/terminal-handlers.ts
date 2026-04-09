/**
 * Terminal IPC handlers
 */

import { TERMINALS } from '@shared/ipc/terminals/channels';

import type { TerminalService } from '../../services/terminal/terminal-service';
import type { IpcRouter } from '../router';

export function registerTerminalHandlers(router: IpcRouter, service: TerminalService): void {
  router.handle(TERMINALS.LIST.ALL, ({ projectPath }) =>
    Promise.resolve(service.listTerminals(projectPath)),
  );

  router.handle(TERMINALS.CREATE.SESSION, ({ cwd, projectPath }) =>
    Promise.resolve(service.createTerminal(cwd, projectPath)),
  );

  router.handle(TERMINALS.CLOSE.SESSION, ({ sessionId }) =>
    Promise.resolve(service.closeTerminal(sessionId)),
  );

  router.handle(TERMINALS.SEND.INPUT, ({ sessionId, data }) =>
    Promise.resolve(service.sendInput(sessionId, data)),
  );

  router.handle(TERMINALS.RESIZE.SESSION, ({ sessionId, cols, rows }) =>
    Promise.resolve(service.resizeTerminal(sessionId, cols, rows)),
  );

  router.handle(TERMINALS.INVOKE['CLAUDE-CLI'], ({ sessionId, cwd }) =>
    Promise.resolve(service.invokeClaudeCli(sessionId, cwd)),
  );
}
