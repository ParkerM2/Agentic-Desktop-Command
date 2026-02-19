/**
 * Task executor — handles task creation commands.
 */

import type { AssistantContext, AssistantResponse } from '@shared/types';

import { serviceLogger } from '@main/lib/logger';

import { buildActionResponse, buildErrorResponse, UNKNOWN_ERROR } from './response-builders';

import type { ClassifiedIntent } from '../intent-classifier';
import type { CommandExecutorDeps } from './types';

export function handleCreateTask(
  intent: ClassifiedIntent,
  context: AssistantContext | undefined,
  deps: CommandExecutorDeps,
): AssistantResponse {
  const title = intent.extractedEntities.title || intent.originalInput;
  const description = intent.extractedEntities.description || '';

  if (!deps.taskService) {
    return buildErrorResponse('Task service is not available.');
  }

  if (!context?.activeProjectId) {
    return buildErrorResponse('No active project selected. Please select a project first.');
  }

  try {
    const task = deps.taskService.createTask({
      title,
      description,
      projectId: context.activeProjectId,
    });

    // Also add a time block to today's plan if planner is available
    if (deps.plannerService && context.todayDate) {
      try {
        deps.plannerService.addTimeBlock(context.todayDate, {
          startTime: '',
          endTime: '',
          label: title,
          type: 'focus',
        });
      } catch {
        // Non-critical — time block creation failure shouldn't fail task creation
        serviceLogger.warn('[CommandExecutor] Failed to add time block for task');
      }
    }

    const projectNote = context.activeProjectName ? ` in ${context.activeProjectName}` : '';
    return buildActionResponse(
      `Task created: "${task.title}"${projectNote} — added to today's plan`,
      intent,
      'create_task',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Failed to create task: ${message}`);
  }
}

export function executeTaskCreation(
  intent: ClassifiedIntent,
  context: AssistantContext | undefined,
  deps: CommandExecutorDeps,
): AssistantResponse {
  // If we have a task service and active project, create directly
  if (deps.taskService && context?.activeProjectId) {
    return handleCreateTask(intent, context, deps);
  }

  // Otherwise, return a preview for confirmation
  const title = intent.extractedEntities.title || intent.originalInput;
  return {
    type: 'action',
    content: `Task ready to create: "${title}"`,
    intent: 'task_creation',
    action: 'create_task',
    metadata: {
      subtype: 'task',
      title,
      requiresConfirmation: 'true',
    },
  };
}
