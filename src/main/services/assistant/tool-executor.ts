/**
 * Tool executor — maps Anthropic tool_use calls to app service methods.
 *
 * When Claude returns a tool_use block, this module dispatches the call
 * to the appropriate service, emits a cache-invalidation event to the
 * renderer, and returns the tool_result payload.
 */

import type { IdeasService } from '../ideas/ideas-service';
import type { MilestonesService } from '../milestones/milestones-service';
import type { NotesService } from '../notes/notes-service';
import type { PlannerService } from '../planner/planner-service';

const QUERY_KEY_NOTES = 'notes';
const QUERY_KEY_MILESTONES = 'milestones';
const QUERY_KEY_IDEAS = 'ideas';
const QUERY_KEY_PLANNER = 'planner';

export interface ToolExecutorDeps {
  notesService: NotesService | null;
  milestonesService: MilestonesService | null;
  ideasService: IdeasService | null;
  plannerService: PlannerService | null;
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

export function createToolExecutor(deps: ToolExecutorDeps) {
  const { notesService, milestonesService, ideasService, plannerService, sendEvent } = deps;

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

  function execute(toolName: string, input: ToolInput): ToolResult {
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
