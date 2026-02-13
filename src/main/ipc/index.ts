/**
 * IPC Handler Registry
 *
 * Wires all domain handlers to the IPC router.
 * Each handler file is thin — it maps channels to service calls.
 */

import { registerAgentHandlers } from './handlers/agent-handlers';
import { registerAlertHandlers } from './handlers/alert-handlers';
import { registerAppHandlers } from './handlers/app-handlers';
import { registerAssistantHandlers } from './handlers/assistant-handlers';
import { registerCalendarHandlers } from './handlers/calendar-handlers';
import { registerChangelogHandlers } from './handlers/changelog-handlers';
import { registerClaudeHandlers } from './handlers/claude-handlers';
import { registerFitnessHandlers } from './handlers/fitness-handlers';
import { registerGitHandlers } from './handlers/git-handlers';
import { registerGitHubHandlers } from './handlers/github-handlers';
import { registerHubHandlers } from './handlers/hub-handlers';
import { registerIdeasHandlers } from './handlers/ideas-handlers';
import { registerInsightsHandlers } from './handlers/insights-handlers';
import { registerMcpHandlers } from './handlers/mcp-handlers';
import { registerMergeHandlers } from './handlers/merge-handlers';
import { registerMilestonesHandlers } from './handlers/milestones-handlers';
import { registerNotesHandlers } from './handlers/notes-handlers';
import { registerPlannerHandlers } from './handlers/planner-handlers';
import { registerProjectHandlers } from './handlers/project-handlers';
import { registerSettingsHandlers } from './handlers/settings-handlers';
import { registerSpotifyHandlers } from './handlers/spotify-handlers';
import { registerTaskHandlers } from './handlers/task-handlers';
import { registerTerminalHandlers } from './handlers/terminal-handlers';
import { registerTimeHandlers } from './handlers/time-handlers';
import { registerWebhookSettingsHandlers } from './handlers/webhook-settings-handlers';

import type { IpcRouter } from './router';
import type { TokenStore } from '../auth/token-store';
import type { OAuthConfig } from '../auth/types';
import type { McpManager } from '../mcp/mcp-manager';
import type { AgentQueue } from '../services/agent/agent-queue';
import type { AgentService } from '../services/agent/agent-service';
import type { AlertService } from '../services/alerts/alert-service';
import type { AssistantService } from '../services/assistant/assistant-service';
import type { CalendarService } from '../services/calendar/calendar-service';
import type { ChangelogService } from '../services/changelog/changelog-service';
import type { ClaudeClient } from '../services/claude';
import type { FitnessService } from '../services/fitness/fitness-service';
import type { GitService } from '../services/git/git-service';
import type { WorktreeService } from '../services/git/worktree-service';
import type { GitHubService } from '../services/github/github-service';
import type { HubConnectionManager } from '../services/hub/hub-connection';
import type { HubSyncService } from '../services/hub/hub-sync';
import type { IdeasService } from '../services/ideas/ideas-service';
import type { InsightsService } from '../services/insights/insights-service';
import type { MergeService } from '../services/merge/merge-service';
import type { MilestonesService } from '../services/milestones/milestones-service';
import type { NotesService } from '../services/notes/notes-service';
import type { PlannerService } from '../services/planner/planner-service';
import type { ProjectService } from '../services/project/project-service';
import type { TaskService } from '../services/project/task-service';
import type { SettingsService } from '../services/settings/settings-service';
import type { SpotifyService } from '../services/spotify/spotify-service';
import type { GithubTaskImporter } from '../services/tasks/github-importer';
import type { TaskDecomposer } from '../services/tasks/task-decomposer';
import type { TerminalService } from '../services/terminal/terminal-service';
import type { TimeParserService } from '../services/time-parser/time-parser-service';

export interface Services {
  projectService: ProjectService;
  taskService: TaskService;
  terminalService: TerminalService;
  settingsService: SettingsService;
  agentService: AgentService;
  agentQueue: AgentQueue;
  claudeClient: ClaudeClient;
  alertService: AlertService;
  assistantService: AssistantService;
  calendarService: CalendarService;
  changelogService: ChangelogService;
  fitnessService: FitnessService;
  hubConnectionManager: HubConnectionManager;
  hubSyncService: HubSyncService;
  ideasService: IdeasService;
  insightsService: InsightsService;
  mcpManager: McpManager;
  milestonesService: MilestonesService;
  notesService: NotesService;
  plannerService: PlannerService;
  spotifyService: SpotifyService;
  gitService: GitService;
  githubService: GitHubService;
  worktreeService: WorktreeService;
  mergeService: MergeService;
  timeParserService: TimeParserService;
  taskDecomposer: TaskDecomposer;
  githubImporter: GithubTaskImporter;
  dataDir: string;
  providers: Map<string, OAuthConfig>;
  tokenStore: TokenStore;
}

export function registerAllHandlers(router: IpcRouter, services: Services): void {
  registerProjectHandlers(router, services.projectService);
  registerTaskHandlers(
    router,
    services.taskService,
    services.agentService,
    services.projectService,
    services.taskDecomposer,
    services.githubImporter,
  );
  registerTerminalHandlers(router, services.terminalService);
  registerSettingsHandlers(router, services.settingsService, {
    dataDir: services.dataDir,
    providers: services.providers,
    onAgentSettingsChanged: (settings) => {
      services.agentQueue.setMaxConcurrent(settings.maxConcurrentAgents);
    },
  });
  registerAgentHandlers(router, services.agentService);
  registerAlertHandlers(router, services.alertService);
  registerAppHandlers(router, {
    tokenStore: services.tokenStore,
    providers: services.providers,
  });
  registerAssistantHandlers(router, services.assistantService);
  registerCalendarHandlers(router, services.calendarService);
  registerClaudeHandlers(router, services.claudeClient);
  registerChangelogHandlers(router, services.changelogService);
  registerFitnessHandlers(router, services.fitnessService);
  registerIdeasHandlers(router, services.ideasService);
  registerInsightsHandlers(router, services.insightsService);
  registerMilestonesHandlers(router, services.milestonesService);
  registerNotesHandlers(router, services.notesService);
  registerPlannerHandlers(router, services.plannerService);
  registerSpotifyHandlers(router, services.spotifyService);
  registerGitHandlers(router, services.gitService, services.worktreeService);
  registerGitHubHandlers(router, services.githubService);
  registerHubHandlers(router, services.hubConnectionManager, services.hubSyncService);
  registerMcpHandlers(router, services.mcpManager);
  registerMergeHandlers(router, services.mergeService);
  registerTimeHandlers(router, services.timeParserService);
  registerWebhookSettingsHandlers(router, services.settingsService);
}
