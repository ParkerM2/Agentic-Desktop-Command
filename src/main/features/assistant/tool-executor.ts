/**
 * Tool executor — maps Anthropic tool_use calls to app service methods.
 *
 * When Claude returns a tool_use block, this module dispatches the call
 * to the appropriate service, emits a cache-invalidation event to the
 * renderer, and returns the tool_result payload.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ASSISTANT_EVENTS } from '@shared/ipc/assistant/channels';

import { handleGitTool } from './tool-handlers/git-tools';
import {
  executeTasksCreate,
  executeTasksDelete,
  executeTasksList,
  executeTasksUpdate,
} from './tool-handlers/task-tools';

import type { BriefingService } from '../briefing/briefing-service';
import type { ChangelogService } from '../changelog/changelog-service';
import type { IdeasService } from '../ideas/ideas-service';
import type { MilestonesService } from '../milestones/milestones-service';
import type { NotesService } from '../notes/notes-service';
import type { PlannerService } from '../planner/planner-service';
import type { ProgressService } from '../progress/progress-service';
import type { ProjectService } from '../project/project-service';
import type { GitToolDeps } from './tool-handlers/git-tools';
import type { WorkspaceSessionManager } from '../workspace/workspace-session-manager';

const QUERY_KEY_NOTES = 'notes';
const QUERY_KEY_MILESTONES = 'milestones';
const QUERY_KEY_IDEAS = 'ideas';
const QUERY_KEY_PLANNER = 'planner';
const QUERY_KEY_WORKSPACE = 'workspace';
const ERR_PROGRESS_UNAVAILABLE = 'Progress service unavailable';

export interface ToolExecutorDeps {
  notesService: NotesService | null;
  milestonesService: MilestonesService | null;
  ideasService: IdeasService | null;
  plannerService: PlannerService | null;
  projectService: Pick<ProjectService, 'listProjectsSync' | 'getProjectPath'> | null;
  progressService: ProgressService | null;
  briefingService: BriefingService | null;
  changelogService: ChangelogService | null;
  gitToolDeps: GitToolDeps;
  workspaceSessionManager: WorkspaceSessionManager | null;
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
  const { notesService, milestonesService, ideasService, plannerService, projectService, progressService, briefingService, changelogService, gitToolDeps, workspaceSessionManager, sendEvent } = deps;

  function emitExecuted(toolName: string, result: ToolResult): void {
    sendEvent(ASSISTANT_EVENTS.TOOL.EXECUTED, {
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

  // ── Handler map ─────────────────────────────────────────────
  type ToolHandler = (input: ToolInput) => ToolResult | Promise<ToolResult>;

  async function executeGenerateBriefing(): Promise<ToolResult> {
    if (!briefingService) return fail('Briefing service unavailable');
    const briefing = await briefingService.generateBriefing();
    return ok(briefing, 'briefing');
  }

  async function executeGenerateChangelog(input: ToolInput): Promise<ToolResult> {
    if (!changelogService) return fail('Changelog service unavailable');
    const repoPath = projectService?.getProjectPath(getString(input, 'projectId')) ?? '';
    if (repoPath.length === 0) return fail('Project not found');
    const entry = await changelogService.generateFromGit(
      repoPath,
      getString(input, 'version', '0.0.0'),
      typeof input.fromTag === 'string' ? input.fromTag : undefined,
    );
    return ok(entry, 'changelog');
  }

  async function executeTaskTool(name: string, input: ToolInput): Promise<ToolResult> {
    if (!progressService) return fail(ERR_PROGRESS_UNAVAILABLE);
    if (name === 'tasks_create') return await executeTasksCreate(input, progressService);
    if (name === 'tasks_list') return await executeTasksList(input, progressService);
    if (name === 'tasks_update') return await executeTasksUpdate(input, progressService);
    if (name === 'tasks_delete') return await executeTasksDelete(input, progressService);
    return fail(`Unknown task tool: ${name}`);
  }

  async function executeHandOffPlan(input: ToolInput): Promise<ToolResult> {
    if (!workspaceSessionManager) return fail('Workspace service unavailable');
    const projectId = getString(input, 'projectId');
    const planPath = getString(input, 'planPath');
    const instructions = typeof input.instructions === 'string' ? input.instructions : undefined;
    if (projectId.length === 0 || planPath.length === 0) {
      return fail('projectId and planPath are required');
    }
    const result = await workspaceSessionManager.handOffPlan(projectId, planPath, instructions);
    return ok(
      {
        message: result.action === 'reused'
          ? `Plan handed off to existing Team Lead ${String(result.teamLeadIndex + 1)} (session ${result.sessionId})`
          : `Spawned new Team Lead ${String(result.teamLeadIndex + 1)} with plan (session ${result.sessionId})`,
        ...result,
      },
      QUERY_KEY_WORKSPACE,
    );
  }

  async function executeExecuteTask(input: ToolInput): Promise<ToolResult> {
    if (!workspaceSessionManager) return fail('Workspace service unavailable');
    const projectId = getString(input, 'projectId');
    const taskDescription = getString(input, 'taskDescription');
    const planPath = typeof input.planPath === 'string' ? input.planPath : undefined;
    if (projectId.length === 0 || taskDescription.length === 0) {
      return fail('projectId and taskDescription are required');
    }
    const result = await workspaceSessionManager.executeTask(projectId, taskDescription, planPath);
    return ok(
      {
        message: result.action === 'reused'
          ? `Task sent to existing Team Lead ${String(result.teamLeadIndex + 1)}`
          : `Spawned new Team Lead ${String(result.teamLeadIndex + 1)} with task`,
        ...result,
      },
      QUERY_KEY_WORKSPACE,
    );
  }

  // Map uses string keys to avoid camelCase naming convention lint
  const handlerMap = new Map<string, ToolHandler>([
    ['create_note', executeCreateNote],
    ['create_milestone', executeCreateMilestone],
    ['create_idea', executeCreateIdea],
    ['add_daily_goal', executeAddDailyGoal],
    ['list_projects', () => executeListProjects(projectService)],
    ['query_recent_items', (input) => executeQueryRecentItems(input, notesService, milestonesService, ideasService)],
    ['list_progress_features', () => executeListProgressFeatures()],
    ['read_progress_file', (input) => executeReadProgressFile(input)],
    ['generate_briefing', () => executeGenerateBriefing()],
    ['generate_changelog', (input) => executeGenerateChangelog(input)],
    ['get_insights', () => ({ success: true, data: { message: 'Use the Insights page for detailed analytics.' }, queryKeyRoots: [] })],
    ['tasks_create', (input) => executeTaskTool('tasks_create', input)],
    ['tasks_list', (input) => executeTaskTool('tasks_list', input)],
    ['tasks_update', (input) => executeTaskTool('tasks_update', input)],
    ['tasks_delete', (input) => executeTaskTool('tasks_delete', input)],
    ['git_status', async (input) => (await handleGitTool('git_status', input, gitToolDeps)) ?? fail('Git tool failed')],
    ['github_list_prs', async (input) => (await handleGitTool('github_list_prs', input, gitToolDeps)) ?? fail('GitHub tool failed')],
    ['hand_off_plan', executeHandOffPlan],
    ['execute_task', executeExecuteTask],
  ]);

  async function execute(toolName: string, input: ToolInput): Promise<ToolResult> {
    const handler = handlerMap.get(toolName);
    if (!handler) return fail(`Unknown tool: ${toolName}`);

    const result = await handler(input);
    if (result.success) {
      emitExecuted(toolName, result);
    }
    return result;
  }

  return { execute };
}

export type ToolExecutor = ReturnType<typeof createToolExecutor>;
