/**
 * Task CRUD tool handlers for the assistant tool executor.
 *
 * Each handler validates input, delegates to ProgressService, and returns
 * a standardised ToolResult with queryKeyRoots for cache invalidation.
 */

import type { ProgressPriority } from '@shared/types/progress';

import type { ProgressService } from '../../progress/progress-service';

type ToolInput = Record<string, unknown>;

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  queryKeyRoots: string[];
}

/** Map tool-definition priority values to ProgressPriority. */
const PRIORITY_MAP: Record<string, ProgressPriority> = {
  low: 'low',
  medium: 'normal',
  high: 'high',
  critical: 'urgent',
};

const QUERY_KEY_PROGRESS = 'progress';

function ok(data: unknown): ToolResult {
  return { success: true, data, queryKeyRoots: [QUERY_KEY_PROGRESS] };
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

/** Generate a slug from a title: lowercase, spaces to hyphens, strip non-alphanumeric. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^a-z0-9-]/g, '')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

export async function executeTasksCreate(
  input: ToolInput,
  progressService: ProgressService,
): Promise<ToolResult> {
  const title = getString(input, 'title');
  if (!title) return fail('title is required');

  const slug = getString(input, 'slug') || slugify(title);
  if (!slug) return fail('Could not generate slug from title');

  const description = getString(input, 'description');
  const priority = PRIORITY_MAP[getString(input, 'priority')] as ProgressPriority | undefined;

  try {
    const task = await progressService.createTask(slug, title, description || '', priority);
    return ok(task);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to create task');
  }
}

export async function executeTasksList(
  _input: ToolInput,
  progressService: ProgressService,
): Promise<ToolResult> {
  try {
    const tasks = await progressService.listTasks();
    return okReadOnly(tasks);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to list tasks');
  }
}

export async function executeTasksUpdate(
  input: ToolInput,
  progressService: ProgressService,
): Promise<ToolResult> {
  const slug = getString(input, 'slug');
  if (!slug) return fail('slug is required');

  const { updates } = input;
  if (updates === undefined || updates === null || typeof updates !== 'object') {
    return fail('updates object is required');
  }

  try {
    const task = await progressService.updateTask(
      slug,
      updates as Record<string, unknown>,
    );
    return ok(task);
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to update task');
  }
}

export async function executeTasksDelete(
  input: ToolInput,
  progressService: ProgressService,
): Promise<ToolResult> {
  const slug = getString(input, 'slug');
  if (!slug) return fail('slug is required');

  try {
    await progressService.deleteTask(slug);
    return ok({ deleted: true, slug });
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to delete task');
  }
}
