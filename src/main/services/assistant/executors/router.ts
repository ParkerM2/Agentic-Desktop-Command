/**
 * Intent-to-executor router.
 *
 * Maps every IntentType to the correct domain executor.
 * The quick-command orchestrator tries direct service calls
 * first, then falls back to MCP tool calls.
 */

import type { AssistantContext, AssistantResponse } from '@shared/types';

import { executeBriefing } from './briefing.executor';
import { executeCalendar } from './calendar.executor';
import { executeChangelog } from './changelog.executor';
import { executeConversation } from './conversation.executor';
import { executeDeviceQuery } from './device.executor';
import { executeEmail } from './email.executor';
import { executeFitness } from './fitness.executor';
import { executeGitHub } from './github.executor';
import { executeIdeation } from './ideation.executor';
import { executeInsights } from './insights.executor';
import { handleLauncher } from './launcher.executor';
import { executeMilestones } from './milestones.executor';
import { executeNotes, handleNotes, handleStandup } from './notes.executor';
import { executePlanner, handleCreateTimeBlock } from './planner.executor';
import { handleReminder } from './reminder.executor';
import {
  buildActionResponse,
  buildErrorResponse,
  buildTextResponse,
  UNKNOWN_ERROR,
} from './response-builders';
import { handleSearch } from './search.executor';
import { handleSpotify } from './spotify.executor';
import { executeTaskCreation, handleCreateTask } from './task.executor';
import { executeWatch } from './watch.executor';

import type { CommandExecutorDeps } from './types';
import type { ClassifiedIntent } from '../intent-classifier';

/** Map of intent subtypes to MCP server names. */
const SUBTYPE_TO_SERVER: Record<string, string> = {
  spotify: 'spotify',
  notes: 'notes',
  reminder: 'alerts',
  standup: 'standup',
  launcher: 'launcher',
};

/** Map of intent subtypes to MCP tool names. */
const SUBTYPE_TO_TOOL: Record<string, string> = {
  spotify: 'spotify_control',
  notes: 'create_note',
  reminder: 'create_reminder',
  standup: 'log_standup',
  launcher: 'open_app',
};

// ── Quick command orchestrator ────────────────────────────────

async function executeDirectQuickCommand(
  intent: ClassifiedIntent,
  context: AssistantContext | undefined,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse | null> {
  const subtype = intent.subtype ?? '';

  try {
    switch (subtype) {
      case 'notes':
        return deps.notesService ? handleNotes(intent, deps.notesService) : null;
      case 'standup':
        return deps.notesService ? handleStandup(intent, deps.notesService) : null;
      case 'reminder':
        return deps.alertService ? handleReminder(intent, deps.alertService) : null;
      case 'spotify':
        return deps.spotifyService ? await handleSpotify(intent, deps.spotifyService) : null;
      case 'launcher':
        return await handleLauncher(intent);
      case 'task':
        return handleCreateTask(intent, context, deps);
      case 'time_block':
        return handleCreateTimeBlock(intent, context, deps);
      case 'search':
        return handleSearch(intent, deps);
      default:
        return null;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    console.error(`[CommandExecutor] Direct command failed (${subtype}):`, message);
    return buildErrorResponse(`Failed to execute ${subtype} command: ${message}`);
  }
}

async function executeQuickCommand(
  intent: ClassifiedIntent,
  context: AssistantContext | undefined,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  // Try direct service call first
  const directResult = await executeDirectQuickCommand(intent, context, deps);
  if (directResult) {
    return directResult;
  }

  // Fall back to MCP if no direct service handled it
  const subtype = intent.subtype ?? '';
  const serverName = SUBTYPE_TO_SERVER[subtype];
  const toolName = SUBTYPE_TO_TOOL[subtype];

  if (!serverName || !toolName) {
    return buildTextResponse(
      `I understood that as a "${subtype}" command, but no handler is configured yet.`,
    );
  }

  const client = deps.mcpManager.getClient(serverName);
  if (!client?.isConnected()) {
    return buildTextResponse(
      `The ${serverName} service is not connected. I'll note your request: "${intent.originalInput}"`,
    );
  }

  try {
    const result = await deps.mcpManager.callTool(serverName, toolName, intent.extractedEntities);

    if (result.isError) {
      const errorText =
        result.content.length > 0
          ? result.content.map((c) => c.text).join('\n')
          : 'Unknown error from tool';
      return buildErrorResponse(`${serverName} error: ${errorText}`);
    }

    const responseText =
      result.content.length > 0
        ? result.content.map((c) => c.text).join('\n')
        : `Done (${subtype})`;
    return buildActionResponse(responseText, intent);
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    console.error(`[CommandExecutor] MCP tool call failed:`, message);
    return buildErrorResponse(`Failed to execute ${subtype} command: ${message}`);
  }
}

// ── Main router ──────────────────────────────────────────────

/**
 * Route a classified intent to the correct domain executor.
 * Returns an AssistantResponse for every input — never throws.
 */
export async function routeIntent(
  intent: ClassifiedIntent,
  context: AssistantContext | undefined,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  try {
    // Handle Claude-classified actions that map to quick_command
    if (intent.action && intent.type === 'quick_command') {
      return await executeQuickCommand(intent, context, deps);
    }

    switch (intent.type) {
      case 'quick_command':
        return await executeQuickCommand(intent, context, deps);
      case 'task_creation':
        return executeTaskCreation(intent, context, deps);
      case 'watch':
        return executeWatch(intent, deps);
      case 'device_query':
        return await executeDeviceQuery(intent, deps);
      case 'fitness':
        return executeFitness(intent, deps);
      case 'calendar':
        return await executeCalendar(intent, deps);
      case 'briefing':
        return await executeBriefing(intent, deps);
      case 'insights':
        return executeInsights(intent, deps);
      case 'ideation':
        return executeIdeation(intent, deps);
      case 'milestones':
        return executeMilestones(intent, deps);
      case 'email':
        return executeEmail(intent, deps);
      case 'github':
        return await executeGitHub(intent, deps);
      case 'planner':
        return executePlanner(intent, deps);
      case 'notes':
        return executeNotes(intent, deps);
      case 'changelog':
        return executeChangelog(intent, deps);
      case 'conversation':
        return await executeConversation(intent);
      default:
        return buildTextResponse("I'm not sure how to handle that. Could you rephrase?");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    console.error('[CommandExecutor] Unexpected error:', message);
    return buildErrorResponse(`Something went wrong: ${message}`);
  }
}
