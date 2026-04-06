/**
 * Tool executor — maps Anthropic tool_use calls to app service methods.
 *
 * When Claude returns a tool_use block, this module dispatches the call
 * to the appropriate service, emits a cache-invalidation event to the
 * renderer, and returns the tool_result payload.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { handleGitTool } from './tool-handlers/git-tools';
import {
  executeTasksCreate,
  executeTasksDelete,
  executeTasksList,
  executeTasksUpdate,
} from './tool-handlers/task-tools';

import type { IdeasService } from '../ideas/ideas-service';
import type { MilestonesService } from '../milestones/milestones-service';
import type { NotesService } from '../notes/notes-service';
import type { PlannerService } from '../planner/planner-service';
import type { ProjectService } from '../project/project-service';
import type { TaskRepository } from '../tasks/types';
import type { GitToolDeps } from './tool-handlers/git-tools';

const QUERY_KEY_NOTES = 'notes';
const QUERY_KEY_MILESTONES = 'milestones';
const QUERY_KEY_IDEAS = 'ideas';
const QUERY_KEY_PLANNER = 'planner';
const ERR_TASK_UNAVAILABLE = 'Task service unavailable';

export interface ToolExecutorDeps {
  notesService: NotesService | null;
  milestonesService: MilestonesService | null;
  ideasService: IdeasService | null;
  plannerService: PlannerService | null;
  projectService: Pick<ProjectService, 'listProjectsSync' | 'getProjectPath'> | null;
  taskRepository: TaskRepository | null;
  gitToolDeps: GitToolDeps;
  sendEvent: (channel: string, payload: unknown) => void;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  queryKeyRoots: string[];
}

type ToolInput = Record<string, unknown>;

function getString(input: ToolInput, key: string, fallback = ''): string {
  const val = input[key];
  return typeof val === 'string' ? val : fallback;
}

function getStringArray(input: ToolInput, key: string): string[] {
  const val = input[key];
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string');
}

function ok(data: unknown, queryKeyRoot: string): ToolResult {
  return { success: true, data, queryKeyRoots: [queryKeyRoot] };
}

function fail(error: string): ToolResult {
  return { success: false, error, queryKeyRoots: [] };
}

const ALLOWED_PROGRESS_FILES = ['workflow-state.json', 'proof-ledger.jsonl'];
const PROGRESS_DIR = join(process.cwd(), '.claude', 'progress');

function executeListProjects(projectService: ToolExecutorDeps['projectService']): ToolResult {
  const projects = projectService?.listProjectsSync() ?? [];
  return { success: true, data: projects, queryKeyRoots: [] };
}

function executeQueryRecentItems(
  input: ToolInput,
  notesService: NotesService | null,
  milestonesService: MilestonesService | null,
  ideasService: IdeasService | null,
): ToolResult {
  const type = getString(input, 'type');
  const sinceStr = getString(input, 'since', '');
  const since = sinceStr
    ? new Date(sinceStr)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (type === 'notes') {
    if (!notesService) return fail('Notes service unavailable');
    const notes = notesService.listNotes({}).filter((n) => new Date(n.createdAt) >= since);
    return { success: true, data: notes, queryKeyRoots: [] };
  }
  if (type === 'milestones') {
    if (!milestonesService) return fail('Milestones service unavailable');
    const items = milestonesService
      .listMilestones({})
      .filter((m) => new Date(m.createdAt) >= since);
    return { success: true, data: items, queryKeyRoots: [] };
  }
  if (type === 'ideas') {
    if (!ideasService) return fail('Ideas service unavailable');
    const items = ideasService.listIdeas({}).filter((i) => new Date(i.createdAt) >= since);
    return { success: true, data: items, queryKeyRoots: [] };
  }
  return fail(`Unknown type: ${type}`);
}

function executeListProgressFeatures(): ToolResult {
  if (!existsSync(PROGRESS_DIR)) {
    return { success: true, data: [], queryKeyRoots: [] };
  }
  try {
    const entries = readdirSync(PROGRESS_DIR, { withFileTypes: true });
    const features = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    return { success: true, data: features, queryKeyRoots: [] };
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to list progress features');
  }
}

function executeReadProgressFile(input: ToolInput): ToolResult {
  const feature = getString(input, 'feature');
  const file = getString(input, 'file');
  if (!ALLOWED_PROGRESS_FILES.includes(file)) {
    return fail(`File must be one of: ${ALLOWED_PROGRESS_FILES.join(', ')}`);
  }
  if (!feature || feature.includes('..') || feature.includes('/') || feature.includes('\\')) {
    return fail('Invalid feature name');
  }
  const filePath = join(PROGRESS_DIR, feature, file);
  if (!existsSync(filePath)) {
    return { success: true, data: `File not found: ${filePath}`, queryKeyRoots: [] };
  }
  try {
    const content = readFileSync(filePath, 'utf8');
    return { success: true, data: content, queryKeyRoots: [] };
  } catch (err: unknown) {
    return fail(err instanceof Error ? err.message : 'Failed to read file');
  }
}

export function createToolExecutor(deps: ToolExecutorDeps) {
  const { notesService, milestonesService, ideasService, plannerService, projectService, taskRepository, gitToolDeps, sendEvent } = deps;

  function emitExecuted(toolName: string, result: ToolResult): void {
    sendEvent('event:assistant.toolExecuted', {
      toolName,
      queryKeyRoots: result.queryKeyRoots,
      result: result.data,
    });
  }

  function executeCreateNote(input: ToolInput): ToolResult {
    if (!notesService) return fail('Notes service unavailable');
    const note = notesService.createNote({
      title: getString(input, 'title'),
      content: getString(input, 'content'),
      tags: getStringArray(input, 'tags'),
      projectId: typeof input.projectId === 'string' ? input.projectId : undefined,
    });
    return ok(note, QUERY_KEY_NOTES);
  }

  function executeCreateMilestone(input: ToolInput): ToolResult {
    if (!milestonesService) return fail('Milestones service unavailable');
    const milestone = milestonesService.createMilestone({
      title: getString(input, 'title'),
      description: getString(input, 'description'),
      targetDate: getString(input, 'targetDate', new Date().toISOString()),
      projectId: typeof input.projectId === 'string' ? input.projectId : undefined,
    });
    return ok(milestone, QUERY_KEY_MILESTONES);
  }

  function executeCreateIdea(input: ToolInput): ToolResult {
    if (!ideasService) return fail('Ideas service unavailable');
    const validCategories = ['feature', 'improvement', 'bug', 'performance'] as const;
    type IdeaCategory = (typeof validCategories)[number];
    const rawCategory = getString(input, 'category', 'feature');
    const category: IdeaCategory = validCategories.includes(rawCategory as IdeaCategory)
      ? (rawCategory as IdeaCategory)
      : 'feature';
    const idea = ideasService.createIdea({
      title: getString(input, 'title'),
      description: getString(input, 'description'),
      category,
      tags: getStringArray(input, 'tags'),
      projectId: typeof input.projectId === 'string' ? input.projectId : undefined,
    });
    return ok(idea, QUERY_KEY_IDEAS);
  }

  function executeAddDailyGoal(input: ToolInput): ToolResult {
    if (!plannerService) return fail('Planner service unavailable');
    const goalText = getString(input, 'goal');
    const date =
      typeof input.date === 'string' ? input.date : new Date().toISOString().slice(0, 10);
    const existingPlan = plannerService.getDay(date);
    const updatedPlan = plannerService.updateDay(date, {
      goals: [...existingPlan.goals, goalText],
    });
    return ok(updatedPlan, QUERY_KEY_PLANNER);
  }

  async function execute(toolName: string, input: ToolInput): Promise<ToolResult> {
    let result: ToolResult;

    switch (toolName) {
      case 'create_note':
        result = executeCreateNote(input);
        break;
      case 'create_milestone':
        result = executeCreateMilestone(input);
        break;
      case 'create_idea':
        result = executeCreateIdea(input);
        break;
      case 'add_daily_goal':
        result = executeAddDailyGoal(input);
        break;
      case 'list_projects':
        result = executeListProjects(projectService);
        break;
      case 'query_recent_items':
        result = executeQueryRecentItems(input, notesService, milestonesService, ideasService);
        break;
      case 'list_progress_features':
        result = executeListProgressFeatures();
        break;
      case 'read_progress_file':
        result = executeReadProgressFile(input);
        break;
      // ── Task CRUD ──
      case 'tasks_create':
        if (!taskRepository) return fail(ERR_TASK_UNAVAILABLE);
        result = await executeTasksCreate(input, taskRepository);
        break;
      case 'tasks_list':
        if (!taskRepository) return fail(ERR_TASK_UNAVAILABLE);
        result = await executeTasksList(input, taskRepository);
        break;
      case 'tasks_update':
        if (!taskRepository) return fail(ERR_TASK_UNAVAILABLE);
        result = await executeTasksUpdate(input, taskRepository);
        break;
      case 'tasks_delete':
        if (!taskRepository) return fail(ERR_TASK_UNAVAILABLE);
        result = await executeTasksDelete(input, taskRepository);
        break;
      // ── Git & GitHub tools ──
      case 'git_status':
      case 'github_list_prs': {
        const gitResult = await handleGitTool(toolName, input, gitToolDeps);
        if (gitResult) {
          result = gitResult;
          break;
        }
        return fail(`Unknown tool: ${toolName}`);
      }
      default:
        return fail(`Unknown tool: ${toolName}`);
    }

    if (result.success) {
      emitExecuted(toolName, result);
    }
    return result;
  }

  return { execute };
}

export type ToolExecutor = ReturnType<typeof createToolExecutor>;
