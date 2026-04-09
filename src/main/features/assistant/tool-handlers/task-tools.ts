/**
 * Task CRUD tool handlers for the assistant tool executor.
 *
 * Each handler validates input, delegates to TaskRepository, and returns
 * a standardised ToolResult with queryKeyRoots for cache invalidation.
 */

import type { TaskPriority } from '@shared/types/hub/enums';

import type { TaskRepository } from '../../tasks/types';

type ToolInput = Record<string, unknown>;

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  queryKeyRoots: string[];
}

/** Map tool-definition priority values to Hub TaskPriority. */
const PRIORITY_MAP: Record<string, TaskPriority> = {
  low: 'low',
  medium: 'normal',
  high: 'high',
  critical: 'urgent',
};

const QUERY_KEY_TASKS = 'tasks';

function ok(data: unknown): ToolResult {
  return { success: true, data, queryKeyRoots: [QUERY_KEY_TASKS] };
}

function okReadOnly(data: unknown): ToolResult {
  return { success: true, data, queryKeyRoots: [] };
}

function fail(error: string): ToolResult {
  return { success: false, error, queryKeyRoots: [] };
}

function getString(input: ToolInput, key: string, fallback = ''): string {
  const val = input[key];
  return typeof val === 'string' ? val : fallback;
}

export async function executeTasksCreate(
  input: ToolInput,
  taskRepository: TaskRepository,
): Promise<ToolResult> {
  const projectId = getString(input, 'projectId');
  const title = getString(input, 'title');
  if (!projectId) return fail('projectId is required');
  if (!title) return fail('title is required');

  try {
    const task = await taskRepository.createTask({
      projectId,
      title,
      description: getString(input, 'description') || undefined,
      priority: PRIORITY_MAP[getString(input, 'priority')]
    });
    return ok(task);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to create task');
  }
}

export async function executeTasksList(
  input: ToolInput,
  taskRepository: TaskRepository,
): Promise<ToolResult> {
  const projectId = getString(input, 'projectId');
  if (!projectId) return fail('projectId is required');

  try {
    const result = await taskRepository.listTasks({ projectId });
    return okReadOnly(result.tasks);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to list tasks');
  }
}

export async function executeTasksUpdate(
  input: ToolInput,
  taskRepository: TaskRepository,
): Promise<ToolResult> {
  const taskId = getString(input, 'taskId');
  if (!taskId) return fail('taskId is required');

  const { updates } = input;
  if (updates === undefined || updates === null || typeof updates !== 'object') {
    return fail('updates object is required');
  }

  try {
    const task = await taskRepository.updateTask(
      taskId,
      updates as Record<string, unknown>,
    );
    return ok(task);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to update task');
  }
}

export async function executeTasksDelete(
  input: ToolInput,
  taskRepository: TaskRepository,
): Promise<ToolResult> {
  const taskId = getString(input, 'taskId');
  const projectId = getString(input, 'projectId');
  if (!taskId) return fail('taskId is required');
  if (!projectId) return fail('projectId is required');

  try {
    await taskRepository.deleteTask(taskId);
    return ok({ deleted: true, taskId });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to delete task');
  }
}
