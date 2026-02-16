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

import type { CrossDeviceQuery } from './cross-device-query';
import type { ClassifiedIntent } from './intent-classifier';
import type { WatchStore } from './watch-store';
import type { AlertService } from '../alerts/alert-service';
import type { BriefingService } from '../briefing/briefing-service';
import type { CalendarService } from '../calendar/calendar-service';
import type { ChangelogService } from '../changelog/changelog-service';
import type { EmailService } from '../email/email-service';
import type { FitnessService } from '../fitness/fitness-service';
import type { GitHubService } from '../github/github-service';
import type { IdeasService } from '../ideas/ideas-service';
import type { InsightsService } from '../insights/insights-service';
import type { MilestonesService } from '../milestones/milestones-service';
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
  watchStore?: WatchStore;
  crossDeviceQuery?: CrossDeviceQuery;
  fitnessService?: FitnessService;
  calendarService?: CalendarService;
  briefingService?: BriefingService;
  insightsService?: InsightsService;
  ideasService?: IdeasService;
  milestonesService?: MilestonesService;
  emailService?: EmailService;
  githubService?: GitHubService;
  changelogService?: ChangelogService;
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

// ── Watch command handlers ────────────────────────────────────

function handleWatchCreate(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.watchStore) {
    return buildErrorResponse('Watch system is not available.');
  }

  const targetId = intent.extractedEntities.targetId || '';
  const conditionText = intent.extractedEntities.condition || 'changes';
  const followUp = intent.extractedEntities.followUp || '';

  if (targetId.length === 0) {
    return buildErrorResponse('Please specify a task to watch (e.g. "tell me when task 123 is done").');
  }

  const conditionMap: Record<string, { field: string; operator: 'equals' | 'changes'; value?: string }> = {
    done: { field: 'status', operator: 'equals', value: 'done' },
    error: { field: 'status', operator: 'equals', value: 'error' },
    changes: { field: 'status', operator: 'changes' },
  };

  const condition = conditionMap[conditionText] ?? conditionMap.changes;

  const watch = deps.watchStore.add({
    type: conditionText === 'error' ? 'agent_error' : 'task_status',
    targetId,
    condition,
    action: 'notify',
    followUp: followUp.length > 0 ? followUp : undefined,
  });

  const conditionLabelMap: Record<string, string> = {
    done: 'is done',
    error: 'encounters an error',
    changes: 'changes status',
  };
  const conditionLabel = conditionLabelMap[conditionText] ?? 'changes status';
  const followUpNote = watch.followUp ? ` You said: "${watch.followUp}"` : '';
  return buildActionResponse(
    `Got it. I'll notify you when task #${targetId} ${conditionLabel}.${followUpNote}`,
    intent,
    'watch_create',
  );
}

function handleWatchRemove(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.watchStore) {
    return buildErrorResponse('Watch system is not available.');
  }

  const targetId = intent.extractedEntities.targetId || '';

  if (targetId.length === 0) {
    // Remove all watches
    deps.watchStore.clear();
    return buildActionResponse('All watches removed.', intent, 'watch_remove');
  }

  const active = deps.watchStore.getActive();
  const toRemove = active.filter((w) => w.targetId === targetId);

  if (toRemove.length === 0) {
    return buildTextResponse(`No active watches found for task #${targetId}.`);
  }

  for (const w of toRemove) {
    deps.watchStore.remove(w.id);
  }

  return buildActionResponse(
    `Stopped watching task #${targetId} (${String(toRemove.length)} watch${toRemove.length > 1 ? 'es' : ''} removed).`,
    intent,
    'watch_remove',
  );
}

function handleWatchList(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.watchStore) {
    return buildErrorResponse('Watch system is not available.');
  }

  const active = deps.watchStore.getActive();

  if (active.length === 0) {
    return buildTextResponse("You don't have any active watches.");
  }

  const lines = active.map((w) => {
    const conditionLabel =
      w.condition.operator === 'equals'
        ? `${w.condition.field} = ${w.condition.value ?? '?'}`
        : `${w.condition.field} changes`;
    return `- Task #${w.targetId}: ${conditionLabel}`;
  });

  return buildActionResponse(
    `Active watches (${String(active.length)}):\n${lines.join('\n')}`,
    intent,
    'watch_list',
  );
}

function executeWatch(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  const subtype = intent.subtype ?? '';
  switch (subtype) {
    case 'create':
      return handleWatchCreate(intent, deps);
    case 'remove':
      return handleWatchRemove(intent, deps);
    case 'list':
      return handleWatchList(intent, deps);
    default:
      return buildTextResponse('I understood that as a watch command, but could not determine the action.');
  }
}

// ── Device query handler ─────────────────────────────────────

async function executeDeviceQuery(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  if (deps.crossDeviceQuery === undefined) {
    return buildErrorResponse('Cross-device queries are not available. Hub connection required.');
  }

  try {
    const deviceName = intent.extractedEntities.deviceName || '';
    const result = await deps.crossDeviceQuery.query(deviceName);
    return buildActionResponse(result, intent, 'device_query');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Device query failed: ${message}`);
  }
}

// ── Feature domain handlers ──────────────────────────────────

function executeFitness(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.fitnessService) {
    return buildErrorResponse('Fitness service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'log': {
        return buildActionResponse(
          'Ready to log a workout. Please provide workout details (type, duration, exercises).',
          intent,
          'fitness_log',
        );
      }
      case 'query': {
        const workouts = deps.fitnessService.listWorkouts({});
        if (workouts.length === 0) {
          return buildTextResponse('No workouts logged yet.');
        }
        const recent = workouts.slice(0, 5);
        const lines = recent.map(
          (w) => `- ${w.date}: ${w.type} (${String(w.duration)} min)`,
        );
        return buildActionResponse(
          `Recent workouts (${String(workouts.length)} total):\n${lines.join('\n')}`,
          intent,
          'fitness_query',
        );
      }
      case 'measurements': {
        const measurements = deps.fitnessService.getMeasurements(5);
        if (measurements.length === 0) {
          return buildTextResponse('No body measurements recorded yet.');
        }
        const lines = measurements.map((m) => {
          const parts: string[] = [m.date];
          if (m.weight !== undefined) parts.push(`${String(m.weight)} kg`);
          if (m.bodyFat !== undefined) parts.push(`${String(m.bodyFat)}% BF`);
          return `- ${parts.join(', ')}`;
        });
        return buildActionResponse(
          `Recent measurements:\n${lines.join('\n')}`,
          intent,
          'fitness_measurements',
        );
      }
      default:
        return buildTextResponse('I understood that as a fitness command, but could not determine the action.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Fitness command failed: ${message}`);
  }
}

async function executeCalendar(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  if (!deps.calendarService) {
    return buildErrorResponse('Calendar service is not available. Google Calendar OAuth required.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'query': {
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const events = await deps.calendarService.listEvents({
          timeMin: now.toISOString(),
          timeMax: endOfDay.toISOString(),
          maxResults: 10,
        });
        if (events.length === 0) {
          return buildTextResponse('No upcoming events on your calendar today.');
        }
        const lines = events.map((e) => `- ${e.summary} (${e.start ?? 'TBD'})`);
        return buildActionResponse(
          `Today's events (${String(events.length)}):\n${lines.join('\n')}`,
          intent,
          'calendar_query',
        );
      }
      case 'create':
        return buildActionResponse(
          'Ready to create a calendar event. Please provide event details (title, start time, end time).',
          intent,
          'calendar_create',
        );
      default:
        return buildTextResponse('I understood that as a calendar command, but could not determine the action.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Calendar command failed: ${message}`);
  }
}

async function executeBriefing(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  if (!deps.briefingService) {
    return buildErrorResponse('Briefing service is not available.');
  }

  try {
    const cached = deps.briefingService.getDailyBriefing();
    if (cached) {
      return buildActionResponse(cached.summary, intent, 'briefing_get');
    }

    const briefing = await deps.briefingService.generateBriefing();
    return buildActionResponse(briefing.summary, intent, 'briefing_get');
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Briefing generation failed: ${message}`);
  }
}

function executeInsights(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.insightsService) {
    return buildErrorResponse('Insights service is not available.');
  }

  try {
    const metrics = deps.insightsService.getMetrics();
    return buildActionResponse(
      `Project metrics:\n- Tasks: ${String(metrics.completedTasks)}/${String(metrics.totalTasks)} completed (${String(metrics.completionRate)}%)\n- Active agents: ${String(metrics.activeAgents)}\n- Agent success rate: ${String(metrics.agentSuccessRate)}%`,
      intent,
      'insights_query',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Insights query failed: ${message}`);
  }
}

function executeIdeation(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.ideasService) {
    return buildErrorResponse('Ideas service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'create':
        return buildActionResponse(
          'Ready to capture a new idea. Please provide a title and description.',
          intent,
          'ideation_create',
        );
      case 'query': {
        const ideas = deps.ideasService.listIdeas({});
        if (ideas.length === 0) {
          return buildTextResponse('No ideas submitted yet.');
        }
        const lines = ideas.slice(0, 5).map((idea) => `- ${idea.title} [${idea.status}]`);
        const moreText = ideas.length > 5 ? `\n...and ${String(ideas.length - 5)} more` : '';
        return buildActionResponse(
          `Ideas (${String(ideas.length)} total):\n${lines.join('\n')}${moreText}`,
          intent,
          'ideation_query',
        );
      }
      default:
        return buildTextResponse('I understood that as an ideation command, but could not determine the action.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Ideation command failed: ${message}`);
  }
}

function executeMilestones(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.milestonesService) {
    return buildErrorResponse('Milestones service is not available.');
  }

  try {
    const milestones = deps.milestonesService.listMilestones({});
    if (milestones.length === 0) {
      return buildTextResponse('No milestones defined yet.');
    }
    const lines = milestones.slice(0, 5).map(
      (m) => `- ${m.title} (${m.status}) — due: ${m.targetDate}`,
    );
    const moreText = milestones.length > 5 ? `\n...and ${String(milestones.length - 5)} more` : '';
    return buildActionResponse(
      `Milestones (${String(milestones.length)} total):\n${lines.join('\n')}${moreText}`,
      intent,
      'milestones_query',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Milestones query failed: ${message}`);
  }
}

function executeEmail(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.emailService) {
    return buildErrorResponse('Email service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'send': {
        if (!deps.emailService.isConfigured()) {
          return buildErrorResponse('Email is not configured. Please set up SMTP settings first.');
        }
        return buildActionResponse(
          'Ready to compose an email. Please provide recipient, subject, and body.',
          intent,
          'email_send',
        );
      }
      case 'queue': {
        const queued = deps.emailService.getQueuedEmails();
        if (queued.length === 0) {
          return buildTextResponse('Email queue is empty.');
        }
        const lines = queued.slice(0, 5).map(
          (e) => `- To: ${e.email.to.join(', ')} — "${e.email.subject}" (${e.status})`,
        );
        return buildActionResponse(
          `Queued emails (${String(queued.length)}):\n${lines.join('\n')}`,
          intent,
          'email_queue',
        );
      }
      default:
        return buildTextResponse('I understood that as an email command, but could not determine the action.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Email command failed: ${message}`);
  }
}

async function executeGitHub(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): Promise<AssistantResponse> {
  if (!deps.githubService) {
    return buildErrorResponse('GitHub service is not available. GitHub OAuth required.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'prs': {
        // Use a generic query — user can specify repo via entities
        return buildActionResponse(
          'To show pull requests, please specify a repository (owner/repo).',
          intent,
          'github_prs',
        );
      }
      case 'issues': {
        return buildActionResponse(
          'To show issues, please specify a repository (owner/repo).',
          intent,
          'github_issues',
        );
      }
      case 'notifications': {
        const notifications = await deps.githubService.getNotifications({});
        if (notifications.length === 0) {
          return buildTextResponse('No new GitHub notifications.');
        }
        const lines = notifications.slice(0, 5).map(
          (n) => `- [${n.type}] ${n.title} (${n.repoName})`,
        );
        const moreText =
          notifications.length > 5
            ? `\n...and ${String(notifications.length - 5)} more`
            : '';
        return buildActionResponse(
          `GitHub notifications (${String(notifications.length)}):\n${lines.join('\n')}${moreText}`,
          intent,
          'github_notifications',
        );
      }
      default:
        return buildTextResponse('I understood that as a GitHub command, but could not determine the action.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`GitHub command failed: ${message}`);
  }
}

function executePlanner(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.plannerService) {
    return buildErrorResponse('Planner service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'today': {
        const todayDate = new Date().toISOString().slice(0, 10);
        const plan = deps.plannerService.getDay(todayDate);
        if (plan.timeBlocks.length === 0) {
          return buildTextResponse('No plan set for today yet.');
        }
        const lines = plan.timeBlocks.map((b) => {
          const time =
            b.startTime.length > 0 && b.endTime.length > 0
              ? `${b.startTime}-${b.endTime}`
              : 'unscheduled';
          return `- [${time}] ${b.label} (${b.type})`;
        });
        return buildActionResponse(
          `Today's plan (${String(plan.timeBlocks.length)} blocks):\n${lines.join('\n')}`,
          intent,
          'planner_today',
        );
      }
      case 'weekly':
        return buildActionResponse(
          'Weekly review feature coming soon.',
          intent,
          'planner_weekly',
        );
      default:
        return buildTextResponse('I understood that as a planner command, but could not determine the action.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Planner command failed: ${message}`);
  }
}

function executeNotes(intent: ClassifiedIntent, deps: CommandExecutorDeps): AssistantResponse {
  if (!deps.notesService) {
    return buildErrorResponse('Notes service is not available.');
  }

  const subtype = intent.subtype ?? '';
  try {
    switch (subtype) {
      case 'search': {
        const query = intent.extractedEntities.query || intent.originalInput;
        const results = deps.notesService.searchNotes(query);
        if (results.length === 0) {
          return buildTextResponse(`No notes found matching "${query}".`);
        }
        const lines = results.slice(0, 5).map((n) => `- ${n.title}`);
        const moreText = results.length > 5 ? `\n...and ${String(results.length - 5)} more` : '';
        return buildActionResponse(
          `Found ${String(results.length)} note(s):\n${lines.join('\n')}${moreText}`,
          intent,
          'notes_search',
        );
      }
      case 'list': {
        const notes = deps.notesService.listNotes({});
        if (notes.length === 0) {
          return buildTextResponse('No notes yet.');
        }
        const lines = notes.slice(0, 5).map((n) => `- ${n.title}`);
        const moreText = notes.length > 5 ? `\n...and ${String(notes.length - 5)} more` : '';
        return buildActionResponse(
          `Notes (${String(notes.length)} total):\n${lines.join('\n')}${moreText}`,
          intent,
          'notes_list',
        );
      }
      default:
        return buildTextResponse('I understood that as a notes command, but could not determine the action.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Notes command failed: ${message}`);
  }
}

function executeChangelog(
  intent: ClassifiedIntent,
  deps: CommandExecutorDeps,
): AssistantResponse {
  if (!deps.changelogService) {
    return buildErrorResponse('Changelog service is not available.');
  }

  try {
    const entries = deps.changelogService.listEntries();
    if (entries.length === 0) {
      return buildTextResponse('No changelog entries yet.');
    }
    const latest = entries[0];
    const categoryLines = latest.categories.map(
      (c) => `  ${c.type}: ${c.items.join(', ')}`,
    );
    return buildActionResponse(
      `Latest changelog (${latest.version} — ${latest.date}):\n${categoryLines.join('\n')}`,
      intent,
      'changelog_generate',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    return buildErrorResponse(`Changelog command failed: ${message}`);
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
          case 'watch': {
            return executeWatch(intent, deps);
          }
          case 'device_query': {
            return await executeDeviceQuery(intent, deps);
          }
          case 'fitness': {
            return executeFitness(intent, deps);
          }
          case 'calendar': {
            return await executeCalendar(intent, deps);
          }
          case 'briefing': {
            return await executeBriefing(intent, deps);
          }
          case 'insights': {
            return executeInsights(intent, deps);
          }
          case 'ideation': {
            return executeIdeation(intent, deps);
          }
          case 'milestones': {
            return executeMilestones(intent, deps);
          }
          case 'email': {
            return executeEmail(intent, deps);
          }
          case 'github': {
            return await executeGitHub(intent, deps);
          }
          case 'planner': {
            return executePlanner(intent, deps);
          }
          case 'notes': {
            return executeNotes(intent, deps);
          }
          case 'changelog': {
            return executeChangelog(intent, deps);
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
