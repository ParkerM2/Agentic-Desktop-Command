/**
 * Command Executor
 *
 * Routes classified intents to the appropriate MCP server
 * or internal service. Returns an AssistantResponse for every
 * input — errors are returned as response objects, never thrown.
 *
 * Accepts an optional AssistantContext so actions can use the
 * active project, today's date, and current page.
 */

import { execFile } from 'node:child_process';
import { platform } from 'node:os';

import { shell } from 'electron';

import type { AssistantContext, AssistantResponse } from '@shared/types';

import type { McpManager } from '@main/mcp/mcp-manager';

import type { ClassifiedIntent } from './intent-classifier';
import type { AlertService } from '../alerts/alert-service';
import type { NotesService } from '../notes/notes-service';
import type { PlannerService } from '../planner/planner-service';
import type { TaskService } from '../project/task-service';
import type { SpotifyService } from '../spotify/spotify-service';

export interface CommandExecutorDeps {
  mcpManager: McpManager;
  notesService?: NotesService;
  alertService?: AlertService;
  spotifyService?: SpotifyService;
  taskService?: TaskService;
  plannerService?: PlannerService;
}

export interface CommandExecutor {
  /** Execute a classified intent and return a response. Never throws. */
  execute: (intent: ClassifiedIntent, context?: AssistantContext) => Promise<AssistantResponse>;
}

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

const UNKNOWN_ERROR = 'Unknown error';

function buildErrorResponse(message: string): AssistantResponse {
  return {
    type: 'error',
    content: message,
  };
}

function buildTextResponse(content: string): AssistantResponse {
  return {
    type: 'text',
    content,
  };
}

function buildActionResponse(
  content: string,
  intent: ClassifiedIntent,
  action?: string,
): AssistantResponse {
  return {
    type: 'action',
    content,
    intent: intent.type,
    action: intent.action,
    metadata: {
      subtype: intent.subtype ?? '',
      executedAction: action ?? intent.subtype ?? '',
      ...intent.extractedEntities,
    },
  };
}

// ── Direct service command handlers ────────────────────────────

function handleNotes(intent: ClassifiedIntent, notesService: NotesService): AssistantResponse {
  const content = intent.extractedEntities.content || intent.originalInput;
  const note = notesService.createNote({ title: content.slice(0, 80), content });
  return buildActionResponse(`Note created: "${note.title}"`, intent, 'create_note');
}

function handleStandup(intent: ClassifiedIntent, notesService: NotesService): AssistantResponse {
  const raw = intent.extractedEntities.raw || intent.originalInput;
  const note = notesService.createNote({
    title: `Standup ${new Date().toLocaleDateString()}`,
    content: raw,
    tags: ['standup'],
  });
  return buildActionResponse(`Standup logged: "${note.title}"`, intent, 'create_note');
}

function handleReminder(intent: ClassifiedIntent, alertService: AlertService): AssistantResponse {
  const message = intent.extractedEntities.content || intent.originalInput;
  const triggerAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const alert = alertService.createAlert({ type: 'reminder', message, triggerAt });
  return buildActionResponse(`Reminder set: "${alert.message}"`, intent, 'create_reminder');
}

async function handleSpotify(
  intent: ClassifiedIntent,
  spotifyService: SpotifyService,
): Promise<AssistantResponse | null> {
  const action = intent.extractedEntities.action || '';
  const query = (intent.extractedEntities.query || '').trim();

  switch (action) {
    case 'play': {
      if (query.length > 0) {
        const tracks = await spotifyService.search({ query, limit: 1 });
        if (tracks.length > 0) {
          await spotifyService.play({ uri: tracks[0].uri });
          return buildActionResponse(
            `Playing: ${tracks[0].name} by ${tracks[0].artist}`,
            intent,
            'spotify_control',
          );
        }
        return buildTextResponse(`No tracks found for "${query}"`);
      }
      await spotifyService.play({});
      return buildActionResponse('Resumed playback', intent, 'spotify_control');
    }
    case 'pause': {
      await spotifyService.pause();
      return buildActionResponse('Paused playback', intent, 'spotify_control');
    }
    case 'skip':
    case 'next': {
      await spotifyService.next();
      return buildActionResponse('Skipped to next track', intent, 'spotify_control');
    }
    case 'previous': {
      await spotifyService.previous();
      return buildActionResponse('Went to previous track', intent, 'spotify_control');
    }
    case 'volume': {
      const vol = Number.parseInt(query, 10);
      if (!Number.isNaN(vol)) {
        await spotifyService.setVolume({ volumePercent: vol });
        return buildActionResponse(`Volume set to ${String(vol)}%`, intent, 'spotify_control');
      }
      return buildTextResponse('Please specify a volume level (0-100)');
    }
    default:
      return null;
  }
}

async function handleLauncher(intent: ClassifiedIntent): Promise<AssistantResponse> {
  const target = intent.extractedEntities.target || '';
  if (target.length > 0) {
    await shell.openExternal(target.startsWith('http') ? target : `https://${target}`);
    return buildActionResponse(`Opened: ${target}`, intent, 'open_url');
  }
  return buildTextResponse('Please specify what to open.');
}

// ── New action handlers (Claude API classified) ─────────────────

function handleCreateTask(
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
        console.warn('[CommandExecutor] Failed to add time block for task');
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

function handleCreateTimeBlock(
  intent: ClassifiedIntent,
  context: AssistantContext | undefined,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.plannerService) {
    return buildErrorResponse('Planner service is not available.');
  }

  const todayDate = context?.todayDate ?? new Date().toISOString().slice(0, 10);
  const label = intent.extractedEntities.label || intent.originalInput;
  const startTime = intent.extractedEntities.startTime || '';
  const endTime = intent.extractedEntities.endTime || '';
  const blockType = intent.extractedEntities.type || 'focus';

  try {
    const validTypes = new Set(['focus', 'meeting', 'break', 'other']);
    const resolvedType = validTypes.has(blockType) ? blockType : 'focus';

    const block = deps.plannerService.addTimeBlock(todayDate, {
      startTime,
      endTime,
      label,
      type: resolvedType as 'focus' | 'meeting' | 'break' | 'other',
    });

    const timeRange =
      startTime.length > 0 && endTime.length > 0 ? ` ${startTime} - ${endTime}` : '';
    return buildActionResponse(
      `Time block added: ${block.label}${timeRange}`,
      intent,
      'create_time_block',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Failed to create time block: ${message}`);
  }
}

function handleSearch(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  const query = intent.extractedEntities.query || intent.originalInput;

  if (!deps.notesService) {
    return buildErrorResponse('Notes service is not available for search.');
  }

  try {
    const results = deps.notesService.searchNotes(query);
    if (results.length === 0) {
      return buildTextResponse(`No results found for "${query}"`);
    }

    const summaryLines = results.slice(0, 5).map((note) => `- ${note.title}`);
    const moreText = results.length > 5 ? `\n...and ${String(results.length - 5)} more` : '';

    return buildActionResponse(
      `Found ${String(results.length)} result(s):\n${summaryLines.join('\n')}${moreText}`,
      intent,
      'search',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Search failed: ${message}`);
  }
}

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

function executeTaskCreation(
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

const CLI_TIMEOUT_MS = 60_000;
const CLI_MAX_BUFFER = 1_048_576; // 1 MB

function runClaudeCli(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'claude',
      ['--print', '-p', prompt],
      {
        timeout: CLI_TIMEOUT_MS,
        maxBuffer: CLI_MAX_BUFFER,
        shell: platform() === 'win32',
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim() || error.message;
          reject(new Error(detail));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

async function executeConversation(intent: ClassifiedIntent): Promise<AssistantResponse> {
  try {
    const response = await runClaudeCli(intent.originalInput);
    return buildTextResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    console.error('[CommandExecutor] Claude CLI error:', message);
    return buildErrorResponse(`Claude CLI error: ${message}`);
  }
}

export function createCommandExecutor(deps: CommandExecutorDeps): CommandExecutor {
  return {
    async execute(intent, context) {
      try {
        // Handle Claude-classified actions that map to quick_command
        if (intent.action && intent.type === 'quick_command') {
          return await executeQuickCommand(intent, context, deps);
        }

        switch (intent.type) {
          case 'quick_command': {
            return await executeQuickCommand(intent, context, deps);
          }
          case 'task_creation': {
            return executeTaskCreation(intent, context, deps);
          }
          case 'conversation': {
            return await executeConversation(intent);
          }
          default: {
            return buildTextResponse("I'm not sure how to handle that. Could you rephrase?");
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
        console.error('[CommandExecutor] Unexpected error:', message);
        return buildErrorResponse(`Something went wrong: ${message}`);
      }
    },
  };
}
