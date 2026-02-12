/**
 * Agent IPC handlers
 */

import type { AgentService } from '../../services/agent/agent-service';
import type { IpcRouter } from '../router';

export function registerAgentHandlers(router: IpcRouter, service: AgentService): void {
  router.handle('agents.list', ({ projectId }) => Promise.resolve(service.listAgents(projectId)));

  router.handle('agents.stop', ({ agentId }) => Promise.resolve(service.stopAgent(agentId)));

  router.handle('agents.pause', ({ agentId }) => Promise.resolve(service.pauseAgent(agentId)));

  router.handle('agents.resume', ({ agentId }) => Promise.resolve(service.resumeAgent(agentId)));
}
