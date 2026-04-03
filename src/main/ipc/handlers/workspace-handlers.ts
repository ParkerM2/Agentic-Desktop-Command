/**
 * Workspace IPC Handlers
 *
 * Thin handlers — one service call per handler, no business logic.
 */

import type { WorkspaceSessionManager } from '../../services/workspace/workspace-session-manager';
import type { IpcRouter } from '../router';

export function registerWorkspaceHandlers(
  router: IpcRouter,
  workspace: WorkspaceSessionManager,
): void {
  router.handle('workspace.initProject', async ({ projectId, projectPath }) => {
    return await workspace.initProject(projectId, projectPath);
  });

  router.handle('workspace.getSessions', ({ projectId }) => {
    return Promise.resolve(workspace.getSessions(projectId));
  });

  router.handle('workspace.spawnTeamLead', async ({ projectId, planPath }) => {
    return await workspace.spawnTeamLead(projectId, planPath);
  });

  router.handle('workspace.stopTeamLead', async ({ projectId, index }) => {
    return await workspace.stopTeamLead(projectId, index);
  });

  router.handle('workspace.sendMessage', async ({ sessionId, message }) => {
    return await workspace.sendMessage(sessionId, message);
  });
}
