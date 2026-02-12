/**
 * IPC Handler Registry
 *
 * Wires all domain handlers to the IPC router.
 * Each handler file is thin — it maps channels to service calls.
 */

import { registerAgentHandlers } from './handlers/agent-handlers';
import { registerProjectHandlers } from './handlers/project-handlers';
import { registerSettingsHandlers } from './handlers/settings-handlers';
import { registerTaskHandlers } from './handlers/task-handlers';
import { registerTerminalHandlers } from './handlers/terminal-handlers';

import type { IpcRouter } from './router';
import type { AgentService } from '../services/agent/agent-service';
import type { ProjectService } from '../services/project/project-service';
import type { TaskService } from '../services/project/task-service';
import type { SettingsService } from '../services/settings/settings-service';
import type { TerminalService } from '../services/terminal/terminal-service';

export interface Services {
  projectService: ProjectService;
  taskService: TaskService;
  terminalService: TerminalService;
  settingsService: SettingsService;
  agentService: AgentService;
}

export function registerAllHandlers(router: IpcRouter, services: Services): void {
  registerProjectHandlers(router, services.projectService);
  registerTaskHandlers(
    router,
    services.taskService,
    services.agentService,
    services.projectService,
  );
  registerTerminalHandlers(router, services.terminalService);
  registerSettingsHandlers(router, services.settingsService);
  registerAgentHandlers(router, services.agentService);
}
