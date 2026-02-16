/**
 * Agent Orchestrator IPC Handlers
 *
 * Exposes agent spawn/kill/restart operations to the renderer.
 * Bridges between IPC channels and the AgentOrchestrator service.
 */

import { readFileSync } from 'node:fs';

import type { AgentOrchestrator } from '../../services/agent-orchestrator/types';
import type { HubApiClient } from '../../services/hub/hub-api-client';
import type { IpcRouter } from '../router';

export function registerAgentOrchestratorHandlers(
  router: IpcRouter,
  orchestrator: AgentOrchestrator,
  hubApiClient: HubApiClient,
): void {
  router.handle('agent.startPlanning', async ({ taskId, projectPath, taskDescription, subProjectPath }) => {
    // Update task status to 'planning' via Hub API
    await hubApiClient.updateTaskStatus(taskId, 'planning');

    const session = await orchestrator.spawn({
      taskId,
      projectPath,
      subProjectPath,
      prompt: `/create-feature-plan ${taskDescription}`,
      phase: 'planning',
    });

    return { sessionId: session.id, status: 'spawned' as const };
  });

  router.handle('agent.startExecution', async ({ taskId, projectPath, taskDescription, planRef, subProjectPath }) => {
    // Update task status to 'running' via Hub API
    await hubApiClient.updateTaskStatus(taskId, 'running');

    const prompt = planRef
      ? `/implement-feature ${taskDescription} --plan ${planRef}`
      : `/implement-feature ${taskDescription}`;

    const session = await orchestrator.spawn({
      taskId,
      projectPath,
      subProjectPath,
      prompt,
      phase: 'executing',
    });

    return { sessionId: session.id, status: 'spawned' as const };
  });

  router.handle('agent.killSession', ({ sessionId }) => {
    orchestrator.kill(sessionId);
    return Promise.resolve({ success: true });
  });

  router.handle('agent.restartFromCheckpoint', async ({ taskId, projectPath }) => {
    // Kill existing session if alive
    const existingSession = orchestrator.getSessionByTaskId(taskId);
    if (existingSession) {
      orchestrator.kill(existingSession.id);
    }

    // Read progress JSONL for context
    let progressContent = '';
    if (existingSession) {
      try {
        progressContent = readFileSync(existingSession.progressFile, 'utf-8');
      } catch {
        // No progress file yet — start fresh
      }
    }

    // Compose resume prompt with context
    const originalCommand = existingSession?.command ?? 'Continue working on this task';
    const phase = existingSession?.phase ?? 'executing';

    const resumePrompt = progressContent.length > 0
      ? [
          `/resume-feature`,
          `Original task: ${originalCommand}`,
          `Progress so far (JSONL):`,
          progressContent,
          `Resume from where the previous agent stopped.`,
        ].join('\n')
      : originalCommand;

    // Update task status back to active phase
    const hubStatus = phase === 'planning' ? 'planning' : 'running';
    await hubApiClient.updateTaskStatus(taskId, hubStatus);

    const session = await orchestrator.spawn({
      taskId,
      projectPath,
      prompt: resumePrompt,
      phase,
    });

    return { sessionId: session.id, status: 'spawned' as const };
  });

  router.handle('agent.getOrchestratorSession', ({ taskId }) => {
    const session = orchestrator.getSessionByTaskId(taskId);
    return Promise.resolve(session ?? null);
  });

  router.handle('agent.listOrchestratorSessions', () => {
    return Promise.resolve(orchestrator.listActiveSessions());
  });
}
