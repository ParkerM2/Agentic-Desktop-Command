/**
 * Assistant Service — Persistent AI Assistant
 *
 * Processes natural language commands through intent classification
 * and routes them to the appropriate MCP server or internal service.
 * Manages command history and emits events for streaming responses.
 *
 * Supports commands from multiple sources: command bar, Slack, GitHub.
 */

import { randomUUID } from 'node:crypto';

import type {
  AssistantContext,
  AssistantResponse,
  CommandHistoryEntry,
  WebhookCommand,
} from '@shared/types';

import { serviceLogger } from '@main/lib/logger';
import type { McpManager } from '@main/mcp/mcp-manager';

import { createCommandExecutor } from './command-executor';
import { createHistoryStore } from './history-store';
import { classifyIntentAsync } from './intent-classifier';

import type { CommandExecutor } from './command-executor';
import type { CrossDeviceQuery } from './cross-device-query';
import type { HistoryStore } from './history-store';
import type { WatchStore } from './watch-store';
import type { IpcRouter } from '../../ipc/router';
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

export interface AssistantService {
  /** Process a command from any source (UI, Slack, GitHub). */
  sendCommand: (input: string, context?: AssistantContext) => Promise<AssistantResponse>;
  /** Process a webhook-triggered command. */
  processWebhookCommand: (command: WebhookCommand) => Promise<AssistantResponse>;
  /** Get command history entries, newest first. Sync. */
  getHistory: (limit?: number) => CommandHistoryEntry[];
  /** Clear all command history. */
  clearHistory: () => void;
}

export interface AssistantServiceDeps {
  router: IpcRouter;
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

function buildHistoryEntry(
  input: string,
  source: 'commandbar' | 'slack' | 'github',
  intent: string,
  action: string | undefined,
  responseSummary: string,
): CommandHistoryEntry {
  return {
    id: randomUUID(),
    input,
    source,
    intent: intent as CommandHistoryEntry['intent'],
    action: action as CommandHistoryEntry['action'],
    responseSummary: responseSummary.slice(0, 200),
    timestamp: new Date().toISOString(),
  };
}

export function createAssistantService(deps: AssistantServiceDeps): AssistantService {
  const { router, mcpManager } = deps;
  const history: HistoryStore = createHistoryStore();
  const executor: CommandExecutor = createCommandExecutor({
    mcpManager,
    notesService: deps.notesService,
    alertService: deps.alertService,
    spotifyService: deps.spotifyService,
    taskService: deps.taskService,
    plannerService: deps.plannerService,
    watchStore: deps.watchStore,
    crossDeviceQuery: deps.crossDeviceQuery,
    fitnessService: deps.fitnessService,
    calendarService: deps.calendarService,
    briefingService: deps.briefingService,
    insightsService: deps.insightsService,
    ideasService: deps.ideasService,
    milestonesService: deps.milestonesService,
    emailService: deps.emailService,
    githubService: deps.githubService,
    changelogService: deps.changelogService,
  });

  async function processInput(
    input: string,
    source: 'commandbar' | 'slack' | 'github',
    context?: AssistantContext,
  ): Promise<AssistantResponse> {
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) {
      return {
        type: 'error',
        content: 'Empty command',
      };
    }

    // Emit thinking state
    router.emit('event:assistant.thinking', { isThinking: true });

    try {
      // Classify the intent (async — tries regex first, then Claude API)
      const intent = await classifyIntentAsync(trimmedInput);
      serviceLogger.info(
        `[Assistant] Classified "${trimmedInput}" as ${intent.type}/${intent.subtype ?? 'none'} (confidence: ${String(intent.confidence)})`,
      );

      // Execute the command with context
      const response = await executor.execute(intent, context);

      // Log to history
      const entry = buildHistoryEntry(
        trimmedInput,
        source,
        intent.type,
        intent.action,
        response.content,
      );
      history.addEntry(entry);

      // Emit the response event
      router.emit('event:assistant.response', {
        content: response.content,
        type: response.type,
      });

      // Emit command completed event
      router.emit('event:assistant.commandCompleted', {
        id: entry.id,
        source,
        action: intent.action ?? intent.subtype ?? intent.type,
        summary: response.content.slice(0, 100),
        timestamp: entry.timestamp,
      });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      serviceLogger.error('[Assistant] Command processing failed:', message);

      const errorResponse: AssistantResponse = {
        type: 'error',
        content: `Something went wrong: ${message}`,
      };

      router.emit('event:assistant.response', {
        content: errorResponse.content,
        type: 'error',
      });

      return errorResponse;
    } finally {
      router.emit('event:assistant.thinking', { isThinking: false });
    }
  }

  return {
    async sendCommand(input, context) {
      return await processInput(input, 'commandbar', context);
    },

    async processWebhookCommand(command) {
      // Map webhook source context into AssistantContext
      const webhookContext: AssistantContext = {
        activeProjectId: null,
        activeProjectName: null,
        currentPage: `webhook/${command.source}`,
        todayDate: new Date().toISOString().slice(0, 10),
      };

      return await processInput(command.commandText, command.source, webhookContext);
    },

    getHistory(limit) {
      return history.getEntries(limit);
    },

    clearHistory() {
      history.clear();
    },
  };
}
