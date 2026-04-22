/**
 * Workspace IPC Handlers
 *
 * Thin handlers — one service call per handler, no business logic.
 */

import { WORKSPACE } from '@shared/ipc/workspace/channels';

import type { WorkspaceSessionManager } from "./workspace-session-manager";
import type { IpcRouter } from '../../ipc/router';

export function registerWorkspaceHandlers(
  router: IpcRouter,
  workspace: WorkspaceSessionManager,
): void {
  router.handle(WORKSPACE.INIT.PROJECT, async ({ projectId, projectPath }) => {
    return await workspace.initProject(projectId, projectPath);
  });

  router.handle(WORKSPACE.GET.SESSIONS, ({ projectId }) => {
    return Promise.resolve(workspace.getSessions(projectId));
  });

  router.handle(WORKSPACE.SPAWN['TEAM-LEAD'], async ({ projectId, planPath }) => {
    return await workspace.spawnTeamLead(projectId, planPath);
  });

  router.handle(WORKSPACE.STOP['TEAM-LEAD'], async ({ projectId, index }) => {
    return await workspace.stopTeamLead(projectId, index);
  });

  router.handle(WORKSPACE.STOP.PROJECT, async ({ projectId }) => {
    return await workspace.stopProject(projectId);
  });

  router.handle(WORKSPACE.SEND.MESSAGE, async ({ sessionId, message }) => {
    return await workspace.sendMessage(sessionId, message);
  });

  router.handle(WORKSPACE.INIT['ALL-PROJECTS'], async ({ projects }) => {
    await workspace.initAllProjects(projects);
    return { success: true };
  });

  router.handle(WORKSPACE.HANDOFF.PLAN, ({ projectId, planPath, instructions }) => {
    return workspace.handOffPlan(projectId, planPath, instructions);
  });

  router.handle(WORKSPACE.EXECUTE.TASK, ({ projectId, taskDescription, planPath }) => {
    return workspace.executeTask(projectId, taskDescription, planPath);
  });

  router.handle(WORKSPACE.PROVISION.TEAMMATE, async ({ projectId, agentRole, slug, teamName, taskInstructions }) => {
    return await workspace.provisionTeammate(projectId, agentRole, slug, teamName, taskInstructions);
  });

  router.handle(WORKSPACE.TEARDOWN.TEAMMATE, async ({ projectId, slug }) => {
    return await workspace.teardownTeammate(projectId, slug);
  });
}
